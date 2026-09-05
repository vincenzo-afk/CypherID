package com.cypherid.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CypherID API Gateway
 * <p>
 * Spring Cloud Gateway acting as the single entry point for all client requests.
 * Responsibilities:
 * - JWT token validation
 * - Redis-backed rate limiting per user DID
 * - Request routing to downstream microservices
 * - CORS handling
 * - Request ID propagation
 */
@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
