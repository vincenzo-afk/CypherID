package com.cypherid.gateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.test.StepVerifier;

import java.net.InetSocketAddress;

/**
 * RateLimiterConfigTest — unit tests for the DID- and IP-based KeyResolver
 * beans (backend/api-gateway/.../config/RateLimiterConfig.java).
 */
class RateLimiterConfigTest {

    private final RateLimiterConfig config = new RateLimiterConfig();

    @Test
    void didKeyResolver_withDidHeader_usesDidPrefixedKey() {
        KeyResolver resolver = config.didKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets")
                .header("X-User-DID", "did:cypherid:user1")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("did:did:cypherid:user1")
                .verifyComplete();
    }

    @Test
    void didKeyResolver_withoutDidHeader_fallsBackToXForwardedFor() {
        KeyResolver resolver = config.didKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/auth/login")
                .header("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("ip:203.0.113.7")
                .verifyComplete();
    }

    @Test
    void didKeyResolver_blankDidHeader_treatedAsMissing() {
        KeyResolver resolver = config.didKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/assets")
                .header("X-User-DID", "   ")
                .header("X-Forwarded-For", "198.51.100.9")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("ip:198.51.100.9")
                .verifyComplete();
    }

    @Test
    void ipKeyResolver_usesRemoteAddressWhenNoForwardedHeader() {
        KeyResolver resolver = config.ipKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/auth/login")
                .remoteAddress(new InetSocketAddress("192.0.2.55", 54321))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("ip:192.0.2.55")
                .verifyComplete();
    }

    @Test
    void ipKeyResolver_noAddressAvailable_resolvesToUnknown() {
        KeyResolver resolver = config.ipKeyResolver();
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/auth/login").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(resolver.resolve(exchange))
                .expectNext("ip:unknown")
                .verifyComplete();
    }
}
