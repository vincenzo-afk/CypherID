package com.cypherid.asset.service.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * NotificationController — in-app notification inbox
 * (docs/api/16_NOTIFICATION_APIS.md, docs/backend/08_NOTIFICATION_SERVICE.md).
 *
 * <p>Hosted in asset-service for the demo (dedicated notification-service on
 * <p>port 8085 is a future split). Consumes identity/asset/security events
 * <p>via the {@link #publish} hook called by sibling services in-process;
 * <p>Kafka-driven fan-out is handled by the audit-service consumer.
 *
 * <p>GET /api/v1/notifications            → list current-user inbox
 * <p>PUT /api/v1/notifications/{id}/read  → mark read
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    /** userDID → notifications (demo in-memory; audit-service persists the trail). */
    private static final Map<String, Map<String, Object>> STORE = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestHeader("X-User-DID") String userDid) {

        List<Map<String, Object>> inbox = STORE.values().stream()
                .filter(n -> userDid.equals(n.get("userDid")))
                .sorted((a, b) -> String.valueOf(b.get("createdAt"))
                        .compareTo(String.valueOf(a.get("createdAt"))))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("notifications", inbox, "unread",
                inbox.stream().filter(n -> Boolean.FALSE.equals(n.get("read"))).count()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(
            @PathVariable String id,
            @RequestHeader("X-User-DID") String userDid) {

        Map<String, Object> n = STORE.get(id);
        if (n == null || !userDid.equals(n.get("userDid"))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "NOTIFICATION_NOT_FOUND"));
        }
        n.put("read", true);
        return ResponseEntity.ok(Map.of("id", id, "read", true));
    }

    /**
     * In-process publish hook used by sibling controllers/services to fan out
     * VC-issued / access-decision / asset-transferred / security-alert /
     * session-expiry events (docs/backend/08_NOTIFICATION_SERVICE.md).
     */
    public static String publish(String userDid, String type, String message) {
        String id = UUID.randomUUID().toString();
        Map<String, Object> n = new ConcurrentHashMap<>();
        n.put("id", id);
        n.put("userDid", userDid);
        n.put("type", type);
        n.put("message", message);
        n.put("read", false);
        n.put("createdAt", Instant.now().toString());
        STORE.put(id, n);
        return id;
    }
}
