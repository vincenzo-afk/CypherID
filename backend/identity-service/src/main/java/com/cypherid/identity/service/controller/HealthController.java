package com.cypherid.identity.service.controller;

import com.cypherid.identity.service.fabric.FabricGatewayClient;
import com.cypherid.identity.service.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final FabricGatewayClient fabricClient;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    @Value("${fabric.channel-name:cypherid-channel}")
    private String channelName;

    public HealthController(FabricGatewayClient fabricClient,
                            UserRepository userRepository) {
        this.fabricClient = fabricClient;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> components = new LinkedHashMap<>();
        components.put("fabric", checkFabric());
        components.put("postgresql", checkPostgres());
        components.put("redis", checkRedis());
        components.put("kafka", Map.of("status", "UNKNOWN", "note", "Owned by access/asset services"));
        components.put("ipfs", Map.of("status", "UNKNOWN", "note", "Owned by asset-service"));

        boolean up = components.values().stream()
                .allMatch(c -> !"DOWN".equals(((Map<?, ?>) c).get("status")));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", up ? "UP" : "DEGRADED");
        body.put("components", components);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/fabric")
    public ResponseEntity<Map<String, Object>> fabricHealth() {
        Map<String, Object> fabric = checkFabric();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("peers", fabric.getOrDefault("peers", List.of()));
        body.put("channelName", channelName);
        body.put("chaincodes", List.of("IdentityContract", "AccessControlContract", "AssetContract"));
        body.put("status", fabric.get("status"));
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> checkFabric() {
        try {
            fabricClient.resolveDID("did:cypherid:health:probe");
            return Map.of("status", "UP", "peers",
                    List.of(Map.of("name", "peer0.org1.cypherid.com", "status", "UP")));
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "" : e.getMessage();
            if (msg.contains("UNAVAILABLE") || msg.contains("unavailable")) {
                return Map.of("status", "DOWN", "reason", "FABRIC_UNAVAILABLE",
                        "peers", List.of(Map.of("name", "peer0.org1.cypherid.com", "status", "DOWN")));
            }
            return Map.of("status", "UP", "peers",
                    List.of(Map.of("name", "peer0.org1.cypherid.com", "status", "UP")));
        }
    }

    private Map<String, Object> checkPostgres() {
        try {
            userRepository.count();
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "reason", e.getMessage());
        }
    }

    private Map<String, Object> checkRedis() {
        if (redisTemplate == null) {
            return Map.of("status", "DOWN", "reason", "Redis not configured (demo mode)");
        }
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "reason", e.getMessage());
        }
    }
}
