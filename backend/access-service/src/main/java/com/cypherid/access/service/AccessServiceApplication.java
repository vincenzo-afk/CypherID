package com.cypherid.access.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CypherID Access Service (port 8082)
 * Handles RBAC + ABAC access evaluation, policy management, delegation, and multi-sig.
 */
@SpringBootApplication
public class AccessServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AccessServiceApplication.class, args);
    }
}
