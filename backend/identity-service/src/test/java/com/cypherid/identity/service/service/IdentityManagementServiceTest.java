package com.cypherid.identity.service.service;

import com.cypherid.identity.service.crypto.DIDKeyService;
import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.dto.CreateDIDRequest;
import com.cypherid.identity.service.dto.CreateDIDResponse;
import com.cypherid.identity.service.dto.ResolveDIDResponse;
import com.cypherid.identity.service.dto.TxHashResponse;
import com.cypherid.identity.service.fabric.FabricGatewayClient;
import com.cypherid.identity.service.kafka.IdentityEventProducer;
import com.cypherid.identity.service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * IdentityManagementServiceTest — unit tests for DID create / resolve /
 * suspend / revoke, with the Fabric gateway and repository mocked.
 */
@ExtendWith(MockitoExtension.class)
class IdentityManagementServiceTest {

    @Mock
    private FabricGatewayClient fabricClient;

    @Mock
    private DIDKeyService didKeyService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private IdentityEventProducer eventProducer;

    private IdentityManagementService service;

    private KeyPair testKeyPair;

    @BeforeEach
    void setUp() throws Exception {
        service = new IdentityManagementService(fabricClient, didKeyService, userRepository, passwordEncoder, eventProducer);
        testKeyPair = KeyPairGenerator.getInstance("EC").generateKeyPair();
    }

    @Test
    void createDID_success_persistsUserAndReturnsPrivateKeyOnce() throws Exception {
        when(didKeyService.generateKeyPair()).thenReturn(testKeyPair);
        when(didKeyService.encodePublicKey(testKeyPair.getPublic())).thenReturn("pub-key-b64");
        when(didKeyService.encodePrivateKey(testKeyPair.getPrivate())).thenReturn("priv-key-b64");
        when(didKeyService.deriveDID(testKeyPair.getPublic())).thenReturn("did:cypherid:0xnew");
        when(userRepository.existsByDid("did:cypherid:0xnew")).thenReturn(false);
        when(fabricClient.createDID(eq("did:cypherid:0xnew"), eq("pub-key-b64"), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{\"did\":\"did:cypherid:0xnew\"}".getBytes(), "tx-create"));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp-pw");

        CreateDIDResponse response = service.createDID(
                new CreateDIDRequest("DRDO", "Cyber", Map.of("employeeId", "E123")));

        assertEquals("did:cypherid:0xnew", response.did());
        assertEquals("tx-create", response.txHash());
        assertEquals("priv-key-b64", response.privateKey());

        verify(userRepository).save(argThat(u ->
                "did:cypherid:0xnew".equals(u.getDid())
                        && "DRDO".equals(u.getOrganization())
                        && "ACTIVE".equals(u.getStatus())
                        && "UNCLASSIFIED".equals(u.getClearanceLevel())
                        && "hashed-temp-pw".equals(u.getPasswordHash())));
    }

    @Test
    void createDID_collision_throwsBeforeSubmittingToFabric() throws Exception {
        when(didKeyService.generateKeyPair()).thenReturn(testKeyPair);
        when(didKeyService.encodePublicKey(any())).thenReturn("pub-key-b64");
        when(didKeyService.encodePrivateKey(any())).thenReturn("priv-key-b64");
        when(didKeyService.deriveDID(any())).thenReturn("did:cypherid:0xexisting");
        when(userRepository.existsByDid("did:cypherid:0xexisting")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.createDID(
                new CreateDIDRequest("DRDO", null, Map.of())));

        verifyNoInteractions(fabricClient);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resolveDID_success_returnsExtractedStatus() throws Exception {
        when(fabricClient.resolveDID("did:cypherid:0xabc"))
                .thenReturn("{\"did\":\"did:cypherid:0xabc\",\"status\":\"ACTIVE\"}");

        ResolveDIDResponse response = service.resolveDID("did:cypherid:0xabc");

        assertEquals("ACTIVE", response.status());
        assertNotNull(response.didDocument());
        assertNotNull(response.resolvedAt());
    }

    @Test
    void resolveDID_notFound_throws() throws Exception {
        when(fabricClient.resolveDID("did:cypherid:0xghost"))
                .thenThrow(new RuntimeException("not found on ledger"));

        assertThrows(RuntimeException.class, () -> service.resolveDID("did:cypherid:0xghost"));
    }

    @Test
    void suspendDID_updatesLocalStatusAndReturnsTxHash() throws Exception {
        User user = new User();
        user.setDid("did:cypherid:0xabc");
        user.setStatus("ACTIVE");
        when(fabricClient.suspendDID(eq("did:cypherid:0xabc"), eq("did:cypherid:admin:root"), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-suspend"));
        when(userRepository.findByDid("did:cypherid:0xabc")).thenReturn(Optional.of(user));

        TxHashResponse response = service.suspendDID("did:cypherid:0xabc", "did:cypherid:admin:root", "policy violation");

        assertEquals("tx-suspend", response.txHash());
        assertEquals("SUSPENDED", response.status());
        assertEquals("SUSPENDED", user.getStatus());
        verify(userRepository).save(user);
    }

    @Test
    void suspendDID_localUserMissing_stillReturnsTxHash() throws Exception {
        when(fabricClient.suspendDID(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-suspend-2"));
        when(userRepository.findByDid("did:cypherid:0xunknown")).thenReturn(Optional.empty());

        TxHashResponse response = service.suspendDID("did:cypherid:0xunknown", "did:cypherid:admin:root", "reason");

        assertEquals("tx-suspend-2", response.txHash());
        verify(userRepository, never()).save(any());
    }

    @Test
    void revokeDID_updatesLocalStatusAndReturnsTxHash() throws Exception {
        User user = new User();
        user.setDid("did:cypherid:0xabc");
        user.setStatus("ACTIVE");
        when(fabricClient.revokeDID(eq("did:cypherid:0xabc"), eq("did:cypherid:admin:root"), anyString(), anyString(), anyString()))
                .thenReturn(new FabricGatewayClient.TxOutcome("{}".getBytes(), "tx-revoke"));
        when(userRepository.findByDid("did:cypherid:0xabc")).thenReturn(Optional.of(user));

        TxHashResponse response = service.revokeDID("did:cypherid:0xabc", "did:cypherid:admin:root", "compromised key");

        assertEquals("REVOKED", response.status());
        assertEquals("REVOKED", user.getStatus());
    }

    @Test
    void revokeDID_fabricFailure_wrapsAndThrows() throws Exception {
        when(fabricClient.revokeDID(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("gateway unavailable"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.revokeDID("did:cypherid:0xabc", "did:cypherid:admin:root", "reason"));
        assertTrue(ex.getMessage().contains("Failed to revoke DID"));
    }
}
