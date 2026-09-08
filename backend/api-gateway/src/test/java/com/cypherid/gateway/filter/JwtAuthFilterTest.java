package com.cypherid.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * JwtAuthFilterTest — unit tests for the gateway's JWT validation filter
 * (backend/api-gateway/.../filter/JwtAuthFilter.java), exercised directly
 * against the reactive filter chain with a test HMAC secret.
 */
class JwtAuthFilterTest {

    private static final String TEST_SECRET = "test-secret-key-for-jwt-auth-filter-unit-tests-only-32bytes+";

    private JwtAuthFilter jwtAuthFilter;
    private GatewayFilterChain chain;

    @BeforeEach
    void setUp() {
        jwtAuthFilter = new JwtAuthFilter();
        ReflectionTestUtils.setField(jwtAuthFilter, "jwtSecret", TEST_SECRET);
        chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
    }

    private String validToken(String did, String org, List<String> roles, Duration ttl) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(did)
                .claim("org", org)
                .claim("roles", String.join(",", roles))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    @Test
    void missingAuthorizationHeader_returnsUnauthorized() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilter filter = jwtAuthFilter.apply(new JwtAuthFilter.Config());
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test
    void malformedAuthorizationHeader_missingBearerPrefix_returnsUnauthorized() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets")
                .header("Authorization", "Basic dXNlcjpwYXNz")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilter filter = jwtAuthFilter.apply(new JwtAuthFilter.Config());
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test
    void expiredToken_returnsUnauthorized() {
        String expired = validToken("did:cypherid:user1", "DRDO", List.of("CLEARANCE_LEVEL_3"), Duration.ofSeconds(-60));
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets")
                .header("Authorization", "Bearer " + expired)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilter filter = jwtAuthFilter.apply(new JwtAuthFilter.Config());
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test
    void tokenSignedWithWrongKey_returnsUnauthorized() {
        SecretKey wrongKey = Keys.hmacShaKeyFor("a-completely-different-32-byte-secret-key!!".getBytes(StandardCharsets.UTF_8));
        String badToken = Jwts.builder()
                .subject("did:cypherid:user1")
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(900)))
                .signWith(wrongKey)
                .compact();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets")
                .header("Authorization", "Bearer " + badToken)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        GatewayFilter filter = jwtAuthFilter.apply(new JwtAuthFilter.Config());
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void validToken_forwardsClaimsAsHeadersAndContinuesChain() {
        String token = validToken("did:cypherid:user1", "DRDO", List.of("CLEARANCE_LEVEL_3", "ADMIN"), Duration.ofMinutes(15));
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets")
                .header("Authorization", "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        when(chain.filter(any())).thenAnswer(inv -> {
            forwarded.set(inv.getArgument(0));
            return Mono.empty();
        });

        GatewayFilter filter = jwtAuthFilter.apply(new JwtAuthFilter.Config());
        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();

        assertNotNull(forwarded.get());
        var headers = forwarded.get().getRequest().getHeaders();
        assertEquals("did:cypherid:user1", headers.getFirst("X-User-DID"));
        assertEquals("DRDO", headers.getFirst("X-User-Org"));
        assertEquals("CLEARANCE_LEVEL_3,ADMIN", headers.getFirst("X-User-Roles"));
        assertNotNull(headers.getFirst("X-Request-ID"));
    }
}
