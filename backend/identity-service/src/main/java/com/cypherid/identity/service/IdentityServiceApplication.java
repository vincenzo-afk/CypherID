package com.cypherid.identity.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * CypherID Identity Service
 * <p>
 * Manages:
 * - DID lifecycle (create, resolve, suspend, revoke)
 * - Verifiable Credential issuance and verification
 * - User authentication (DID + password → JWT)
 * - Fabric CA enrollment
 */
@SpringBootApplication
@EnableScheduling
public class IdentityServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IdentityServiceApplication.class, args);
    }
}
