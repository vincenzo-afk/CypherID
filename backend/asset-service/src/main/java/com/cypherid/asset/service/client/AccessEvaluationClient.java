package com.cypherid.asset.service.client;

import com.cypherid.asset.service.exception.FabricUnavailableException;
import com.cypherid.asset.service.exception.ForbiddenException;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Type;
import java.util.Map;

/**
 * AccessEvaluationClient — calls the Access Service (port 8082) to evaluate
 * access before a protected session is issued
 * (docs/protection/documents/01_PROTECTED_DOCUMENT_FLOW.md).
 * <p>
 * The DID + roles come from the gateway-validated headers and are forwarded
 * to the access service, which performs the on-chain evaluation.
 */
@Component
public class AccessEvaluationClient {

    private static final Logger logger = LoggerFactory.getLogger(AccessEvaluationClient.class);

    private static final Type STRING_MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();

    private final RestTemplate restTemplate;
    private final String accessServiceUrl;
    private final Gson gson = new Gson();

    public AccessEvaluationClient(@Value("${access-service.url:http://localhost:8082}") String accessServiceUrl,
                                  RestTemplateBuilder builder) {
        this.accessServiceUrl = accessServiceUrl;
        this.restTemplate = builder.build();
    }

    /**
     * Evaluates access for the given resource/action.
     *
     * @throws ForbiddenException        403 when the decision is DENIED
     * @throws FabricUnavailableException 503 when the access service is unreachable
     */
    public void requireAccess(String did, String roles, String resourceId, String action) {
        Map<String, Object> body = Map.of(
                "resourceId", resourceId,
                "action", action,
                "contextAttributes", Map.of());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-DID", did);
        if (roles != null && !roles.isBlank()) {
            headers.set("X-User-Roles", roles);
        }

        HttpEntity<String> entity = new HttpEntity<>(gson.toJson(body), headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    accessServiceUrl + "/api/v1/access/request", entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, String> result = gson.fromJson(response.getBody(), STRING_MAP_TYPE);
                if (!"GRANTED".equals(result.get("decision"))) {
                    String reason = result.getOrDefault("reason", "UNKNOWN");
                    throw new ForbiddenException("ACCESS_DENIED_" + reason, "Access denied: " + reason);
                }
                return;
            }

            if (response.getStatusCode() == HttpStatus.FORBIDDEN && response.getBody() != null) {
                Map<String, String> result = gson.fromJson(response.getBody(), STRING_MAP_TYPE);
                String reason = result.getOrDefault("reason", "UNKNOWN");
                throw new ForbiddenException("ACCESS_DENIED_" + reason, "Access denied: " + reason);
            }

            throw new RuntimeException("Access evaluation failed with status: " + response.getStatusCode());

        } catch (RestClientException e) {
            logger.error("Access service unreachable: {}", e.getMessage());
            throw new FabricUnavailableException("Access service unavailable: " + e.getMessage(), e);
        }
    }
}