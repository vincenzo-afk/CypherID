package com.cypherid.audit.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CypherID Audit Service (port 8084)
 *
 * <p>Audit log queries (PostgreSQL mirror of Fabric + Kafka events),
 * realtime WebSocket event streaming (WS /ws/audit), Kafka audit consumer
 * (access-logs, security-alerts, protection-events), and iText PDF reports
 * (see docs/backend/06_AUDIT_SERVICE.md).
 */
@SpringBootApplication
public class AuditServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuditServiceApplication.class, args);
    }
}