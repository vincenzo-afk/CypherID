package com.cypherid.identity.service.service;

import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.dto.AuthResult;
import com.cypherid.identity.service.repository.UserRepository;
import com.cypherid.identity.service.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * AuthenticationServiceTest — unit tests for DID-based login, refresh, and
 * logout (backend/identity-service/.../service/AuthenticationService.java),
 * with the repository / password encoder / JWT service mocked.
 */
@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthenticationService service;

    @BeforeEach
    void setUp() {
        service = new AuthenticationService(userRepository, passwordEncoder, jwtService);
    }

    private User activeUser(String status, String clearance) {
        User user = new User();
        user.setDid("did:cypherid:user1");
        user.setPasswordHash("hashed-pw");
        user.setOrganization("DRDO");
        user.setClearanceLevel(clearance);
        user.setStatus(status);
        return user;
    }

    // ─── authenticate() ─────────────────────────────────────────────────────

    @Test
    void authenticate_validCredentials_issuesTokens() {
        User user = activeUser("ACTIVE", "SECRET");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-password", "hashed-pw")).thenReturn(true);
        when(jwtService.issueAccessToken(eq("did:cypherid:user1"), eq("DRDO"), anyList())).thenReturn("access-token");
        when(jwtService.issueRefreshToken("did:cypherid:user1")).thenReturn("refresh-token");
        when(jwtService.getExpirationSeconds()).thenReturn(900L);
        when(jwtService.getRefreshExpirationSeconds()).thenReturn(86400L);

        AuthResult result = service.authenticate("did:cypherid:user1", "correct-password", "nonce-1");

        assertEquals("access-token", result.accessToken());
        assertEquals("refresh-token", result.refreshToken());
        assertEquals(900L, result.expiresIn());
        assertEquals(86400L, result.refreshExpiresIn());
    }

    @Test
    void authenticate_unknownDid_throws() {
        when(userRepository.findByDid("did:cypherid:ghost")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> service.authenticate("did:cypherid:ghost", "whatever", "nonce-1"));
        verifyNoInteractions(jwtService);
    }

    @Test
    void authenticate_wrongPassword_throwsAndDoesNotIssueTokens() {
        User user = activeUser("ACTIVE", "UNCLASSIFIED");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "hashed-pw")).thenReturn(false);

        assertThrows(RuntimeException.class,
                () -> service.authenticate("did:cypherid:user1", "wrong-password", "nonce-1"));
        verifyNoInteractions(jwtService);
    }

    @Test
    void authenticate_revokedDid_throwsBeforeCheckingPassword() {
        User user = activeUser("REVOKED", "UNCLASSIFIED");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.authenticate("did:cypherid:user1", "any-password", "nonce-1"));

        assertTrue(ex.getMessage().toLowerCase().contains("revoked"));
        verifyNoInteractions(passwordEncoder);
        verifyNoInteractions(jwtService);
    }

    @Test
    void authenticate_suspendedDid_throws() {
        User user = activeUser("SUSPENDED", "UNCLASSIFIED");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.authenticate("did:cypherid:user1", "any-password", "nonce-1"));

        assertTrue(ex.getMessage().toLowerCase().contains("suspended"));
    }

    // ─── refresh() ───────────────────────────────────────────────────────────

    @Test
    void refresh_validToken_rotatesTokensAndRevokesOld() {
        User user = activeUser("ACTIVE", "CONFIDENTIAL");
        when(jwtService.validateRefreshToken("old-refresh")).thenReturn("did:cypherid:user1");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));
        when(jwtService.issueAccessToken(eq("did:cypherid:user1"), eq("DRDO"), anyList())).thenReturn("new-access");
        when(jwtService.issueRefreshToken("did:cypherid:user1")).thenReturn("new-refresh");
        when(jwtService.getExpirationSeconds()).thenReturn(900L);
        when(jwtService.getRefreshExpirationSeconds()).thenReturn(86400L);

        AuthResult result = service.refresh("old-refresh");

        assertEquals("new-access", result.accessToken());
        assertEquals("new-refresh", result.refreshToken());
        verify(jwtService).revokeRefreshToken("old-refresh");
    }

    @Test
    void refresh_userNoLongerActive_revokesAndThrows() {
        User user = activeUser("SUSPENDED", "UNCLASSIFIED");
        when(jwtService.validateRefreshToken("old-refresh")).thenReturn("did:cypherid:user1");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));

        assertThrows(RuntimeException.class, () -> service.refresh("old-refresh"));
        verify(jwtService).revokeRefreshToken("old-refresh");
        verify(jwtService, never()).issueAccessToken(anyString(), anyString(), anyList());
    }

    @Test
    void refresh_unknownDid_throws() {
        when(jwtService.validateRefreshToken("old-refresh")).thenReturn("did:cypherid:ghost");
        when(userRepository.findByDid("did:cypherid:ghost")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.refresh("old-refresh"));
    }

    // ─── logout() ────────────────────────────────────────────────────────────

    @Test
    void logout_revokesBothTokens() {
        service.logout("access-tok", "refresh-tok");

        verify(jwtService).revokeAccessToken("access-tok");
        verify(jwtService).revokeRefreshToken("refresh-tok");
    }

    @Test
    void logout_nullTokens_revokesNothing() {
        service.logout(null, null);

        verify(jwtService, never()).revokeAccessToken(anyString());
        verify(jwtService, never()).revokeRefreshToken(anyString());
    }

    // ─── role derivation (via authenticate, since buildRoles is private) ────

    @Test
    void authenticate_topSecretClearance_grantsFullRoleChain() {
        User user = activeUser("ACTIVE", "TOP_SECRET");
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtService.issueAccessToken(anyString(), anyString(), anyList())).thenReturn("tok");
        when(jwtService.issueRefreshToken(anyString())).thenReturn("ref");

        service.authenticate("did:cypherid:user1", "pw", "nonce-1");

        verify(jwtService).issueAccessToken(eq("did:cypherid:user1"), eq("DRDO"),
                argThat(roles -> roles.contains("TOP_SECRET") && roles.contains("CLEARANCE_LEVEL_4")));
    }

    @Test
    void authenticate_nullClearance_defaultsToUnclassified() {
        User user = activeUser("ACTIVE", null);
        when(userRepository.findByDid("did:cypherid:user1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtService.issueAccessToken(anyString(), anyString(), anyList())).thenReturn("tok");
        when(jwtService.issueRefreshToken(anyString())).thenReturn("ref");

        service.authenticate("did:cypherid:user1", "pw", "nonce-1");

        verify(jwtService).issueAccessToken(eq("did:cypherid:user1"), eq("DRDO"),
                argThat(roles -> roles.contains("UNCLASSIFIED") && roles.contains("CLEARANCE_LEVEL_1")));
    }
}
