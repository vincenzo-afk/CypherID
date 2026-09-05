package com.cypherid.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import reactor.core.publisher.Mono;

/**
 * Rate limiter key resolvers for Redis-backed rate limiting.
 *
 * - didKeyResolver: Rate limit per authenticated user DID
 * - ipKeyResolver: Rate limit per client IP (for unauthenticated routes)
 */
@Configuration
public class RateLimiterConfig {

    /**
     * Key resolver using the authenticated user's DID.
     * The DID is injected by JwtAuthFilter as X-User-DID header.
     */
    @Bean
    public KeyResolver didKeyResolver() {
        return exchange -> {
            String did = exchange.getRequest().getHeaders().getFirst("X-User-DID");
            if (did != null && !did.isBlank()) {
                return Mono.just("did:" + did);
            }
            // Fallback to IP if DID not available
            return Mono.just("ip:" + getClientIp(exchange));
        };
    }

    /**
     * IP-based key resolver for unauthenticated endpoints (e.g., /api/v1/auth/login).
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just("ip:" + getClientIp(exchange));
    }

    private String getClientIp(org.springframework.web.server.ServerWebExchange exchange) {
        String xForwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        var remoteAddr = exchange.getRequest().getRemoteAddress();
        return remoteAddr != null ? remoteAddr.getAddress().getHostAddress() : "unknown";
    }
}
