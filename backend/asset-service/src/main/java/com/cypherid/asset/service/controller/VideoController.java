package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.client.AccessEvaluationClient;
import com.cypherid.asset.service.dto.IssueSessionResponse;
import com.cypherid.asset.service.session.ProtectedSessionService;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * VideoController — protected video playback sessions (docs/api/14_VIDEO_APIS.md).
 *
 * <p>POST /api/v1/videos/{videoId}/session → start protected playback session
 * <p>GET  /api/v1/videos/chunk             → video chunk via protected session
 * <p>Chunk delivery delegates to ProtectedContentService semantics: the client
 * <p>uses the returned sessionToken against /api/v1/protected-content/chunk.
 */
@RestController
@RequestMapping("/api/v1/videos")
public class VideoController {

    private static final Logger logger = LoggerFactory.getLogger(VideoController.class);

    private final AccessEvaluationClient accessEvaluationClient;
    private final ProtectedSessionService sessionService;

    public VideoController(AccessEvaluationClient accessEvaluationClient,
                           ProtectedSessionService sessionService) {
        this.accessEvaluationClient = accessEvaluationClient;
        this.sessionService = sessionService;
    }

    /**
     * POST /api/v1/videos/{videoId}/session — start a protected playback session.
     * Minimum protection profile MEDIUM enforced via asset classification.
     */
    @PostMapping("/{videoId}/session")
    public ResponseEntity<IssueSessionResponse> startPlayback(
            @PathVariable String videoId,
            @RequestHeader("X-User-DID") String userDid,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        accessEvaluationClient.requireAccess(userDid, roles, videoId, "READ");
        IssueSessionResponse response = sessionService.issueSession(userDid, videoId, "VIDEO");
        logger.info("Video session started: video={} user={} session={}",
                videoId, userDid, response.sessionId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/videos/chunk — hint endpoint; actual bytes flow through
     * GET /api/v1/protected-content/chunk?chunk={n} with the session JWT.
     */
    @GetMapping("/chunk")
    public ResponseEntity<Map<String, Object>> chunkHint(
            @RequestParam("sessionId") String sessionId,
            @RequestParam(value = "chunk", defaultValue = "0") int chunk) {

        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "chunk", chunk,
                "fetchVia", "/api/v1/protected-content/chunk?chunk=" + chunk,
                "note", "Pass session JWT as Bearer token"));
    }
}
