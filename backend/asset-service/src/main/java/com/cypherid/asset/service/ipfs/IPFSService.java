package com.cypherid.asset.service.ipfs;

import com.cypherid.asset.service.exception.IPFSException;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Type;
import java.util.Map;

/**
 * IPFSService — client for a local Kubo IPFS node (docs/assets/12_IPFS_STORAGE.md).
 * <p>
 * IPFS stores the AES-256-GCM encrypted asset blob. The returned CID is the
 * pointer recorded on-chain. Content is public by hash; confidentiality is
 * provided by encryption.
 */
@Component
public class IPFSService {

    private static final Logger logger = LoggerFactory.getLogger(IPFSService.class);

    private static final Type STRING_MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();

    private final RestTemplate restTemplate;
    private final String apiUrl;
    private final Gson gson = new Gson();

    public IPFSService(@Value("${ipfs.api-url:http://localhost:5001}") String apiUrl,
                       RestTemplateBuilder builder) {
        this.apiUrl = apiUrl;
        this.restTemplate = builder.build();
    }

    /**
     * Uploads bytes to IPFS and returns the CID (content identifier).
     * Uses POST /api/v0/add (multipart).
     */
    public String upload(byte[] content) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(content) {
                @Override
                public String getFilename() { return "asset.bin"; }
            });

            HttpEntity<LinkedMultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl + "/api/v0/add", entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IPFSException("IPFS add failed with status: " + response.getStatusCode());
            }

            Map<String, String> result = gson.fromJson(response.getBody(), STRING_MAP_TYPE);
            String cid = result != null ? result.get("Hash") : null;
            if (cid == null || cid.isBlank()) {
                throw new IPFSException("IPFS returned no CID");
            }
            logger.info("Uploaded {} bytes to IPFS: {}", content.length, cid);
            return cid;
        } catch (RestClientException e) {
            throw new IPFSException("IPFS node unreachable: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves bytes by CID using POST /api/v0/cat.
     */
    public byte[] cat(String cid) {
        try {
            ResponseEntity<byte[]> response = restTemplate.postForEntity(
                    apiUrl + "/api/v0/cat?arg=" + cid, null, byte[].class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IPFSException("IPFS cat failed with status: " + response.getStatusCode());
            }
            return response.getBody();
        } catch (RestClientException e) {
            throw new IPFSException("IPFS node unreachable: " + e.getMessage(), e);
        }
    }

    /**
     * Best-effort unpin of a CID (used during asset burn). Never throws.
     */
    public void remove(String cid) {
        try {
            restTemplate.postForEntity(apiUrl + "/api/v0/pin/rm?arg=" + cid, null, String.class);
            logger.info("Unpinned IPFS CID: {}", cid);
        } catch (Exception e) {
            logger.warn("Could not unpin IPFS CID {}: {}", cid, e.getMessage());
        }
    }
}