package com.cypherid.gateway.filter;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JwtAuthFilter — Spring Cloud Gateway filter for JWT validation.
 * <p>
 * Validates Bearer token on every incoming request (except /api/v1/auth/**).
 * On success: forwards JWT claims (DID, org, roles) as request headers to downstream services.
 * On failure: returns 401 Unauthorized immediately.
 */
@Component
public class JwtAuthFilter extends AbstractGatewayFilterFactory<JwtAuthFilter.Config> {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    public JwtAuthFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // Extract Authorization header
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return onUnauthorized(exchange, "Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);

            try {
                SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
                Jws<Claims> claimsJws = Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token);

                Claims claims = claimsJws.getPayload();
                String did   = claims.getSubject();
                String org   = claims.get("org", String.class);
                String roles = claims.get("roles", String.class);

                if (did == null || did.isBlank()) {
                    return onUnauthorized(exchange, "JWT missing subject (DID)");
                }

                // Forward claims as headers to downstream services
                ServerHttpRequest mutatedRequest = request.mutate()
                        .header("X-User-DID",   did)
                        .header("X-User-Org",   org   != null ? org   : "")
                        .header("X-User-Roles", roles != null ? roles : "")
                        .header("X-Request-ID", java.util.UUID.randomUUID().toString())
                        .build();

                logger.debug("JWT validated for DID: {} org: {}", did, org);
                return chain.filter(exchange.mutate().request(mutatedRequest).build());

            } catch (ExpiredJwtException e) {
                logger.warn("JWT expired: {}", e.getMessage());
                return onUnauthorized(exchange, "Token expired");
            } catch (JwtException e) {
                logger.warn("JWT invalid: {}", e.getMessage());
                return onUnauthorized(exchange, "Invalid token");
            }
        };
    }

    private Mono<Void> onUnauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        String body = "{\"error\":\"UNAUTHORIZED\",\"message\":\"" + message + "\"}";
        org.springframework.core.io.buffer.DataBuffer buffer =
                response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    public static class Config {
        // No additional config needed
    }
}
