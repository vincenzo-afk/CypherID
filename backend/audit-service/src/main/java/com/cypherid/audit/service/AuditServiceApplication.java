package com.cypherid.audit.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CypherID Audit Service (port 8084)
 * <p>
 * SCAFFOLD ONLY — placeholder so the monorepo Gradle build configures and the
 * API Gateway's /api/v1/audit/** route has a target. Full audit query,
 * dashboard WebSocket, and Kafka audit consumer are implemented in a later
 * phase (see docs/backend/06_AUDIT_SERVICE.md).
 */
@SpringBootApplication
public class AuditServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuditServiceApplication.class, args);
    }
}