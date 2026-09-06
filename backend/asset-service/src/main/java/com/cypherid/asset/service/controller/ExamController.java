package com.cypherid.asset.service.controller;

import com.cypherid.asset.service.client.AccessEvaluationClient;
import com.cypherid.asset.service.dto.IssueSessionResponse;
import com.cypherid.asset.service.session.ProtectedSessionService;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ExamController — protected exam sessions (docs/api/13_EXAM_APIS.md).
 *
 * <p>POST /api/v1/exams/{examId}/session      → start exam (pre-registered)
 * <p>GET  /api/v1/exams/question              → current question (session JWT)
 * <p>POST /api/v1/exams/answer                → submit answer (never returns key)
 * <p>POST /api/v1/exams/{examId}/session/end  → end exam (or TTL auto-expire)
 * <p>GET  /api/v1/exams/{examId}/session/audit → full exam audit (admin)
 */
@RestController
@RequestMapping("/api/v1/exams")
public class ExamController {

    private static final Logger logger = LoggerFactory.getLogger(ExamController.class);

    private final AccessEvaluationClient accessEvaluationClient;
    private final ProtectedSessionService sessionService;

    /** In-memory answer store for demo (questionIndex → answer per session). */
    private final Map<String, Map<Integer, String>> answers = new ConcurrentHashMap<>();
    private final Map<String, String> sessionExam = new ConcurrentHashMap<>();

    public ExamController(AccessEvaluationClient accessEvaluationClient,
                          ProtectedSessionService sessionService) {
        this.accessEvaluationClient = accessEvaluationClient;
        this.sessionService = sessionService;
    }

    /**
     * POST /api/v1/exams/{examId}/session — start an exam session.
     * Minimum protection profile HIGH is enforced inside session issuance
     * via the exam asset classification (docs: exams min HIGH).
     */
    @PostMapping("/{examId}/session")
    public ResponseEntity<IssueSessionResponse> startExam(
            @PathVariable String examId,
            @RequestHeader("X-User-DID") String userDid,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        accessEvaluationClient.requireAccess(userDid, roles, examId, "READ");
        IssueSessionResponse response = sessionService.issueSession(userDid, examId, "EXAM");
        sessionExam.put(response.sessionId(), examId);
        answers.put(response.sessionId(), new ConcurrentHashMap<>());
        logger.info("Exam session started: exam={} user={} session={}", examId, userDid, response.sessionId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/exams/question?sessionToken=… — delegates to protected-content
     * chunk delivery; question index is tracked server-side per session.
     * For demo: returns a pointer the renderer resolves via /chunk.
     */
    @GetMapping("/question")
    public ResponseEntity<Map<String, Object>> currentQuestion(
            @RequestHeader("X-User-DID") String userDid,
            @RequestParam("sessionId") String sessionId,
            @RequestParam(value = "questionIndex", defaultValue = "0") int questionIndex) {

        String examId = sessionExam.get(sessionId);
        if (examId == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "SESSION_NOT_FOUND"));
        }
        return ResponseEntity.ok(Map.of(
                "examId", examId,
                "sessionId", sessionId,
                "questionIndex", questionIndex,
                "chunk", questionIndex,
                "note", "Fetch content via GET /api/v1/protected-content/chunk?chunk=" + questionIndex));
    }

    /**
     * POST /api/v1/exams/answer — submit an answer. Never returns the key.
     */
    @PostMapping("/answer")
    public ResponseEntity<Map<String, Object>> submitAnswer(
            @RequestHeader("X-User-DID") String userDid,
            @RequestBody Map<String, Object> body) {

        String sessionId = String.valueOf(body.getOrDefault("sessionId", ""));
        Object qi = body.get("questionIndex");
        Object answer = body.get("answer");
        if (sessionId.isBlank() || qi == null || answer == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "sessionId, questionIndex, answer required"));
        }
        int questionIndex = ((Number) qi).intValue();
        answers.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .put(questionIndex, String.valueOf(answer));
        logger.info("Exam answer received: session={} q={}", sessionId, questionIndex);
        return ResponseEntity.ok(Map.of("received", true, "questionIndex", questionIndex));
    }

    /**
     * POST /api/v1/exams/{examId}/session/end — end exam, record submission.
     */
    @PostMapping("/{examId}/session/end")
    public ResponseEntity<Map<String, Object>> endExam(
            @PathVariable String examId,
            @RequestHeader("X-User-DID") String userDid,
            @RequestBody(required = false) Map<String, Object> body) {

        String sessionId = body != null ? String.valueOf(body.getOrDefault("sessionId", "")) : "";
        int answered = sessionId.isBlank() ? 0
                : answers.getOrDefault(sessionId, Map.of()).size();
        if (!sessionId.isBlank()) {
            sessionService.closeSession(sessionId, userDid);
            answers.remove(sessionId);
            sessionExam.remove(sessionId);
        }
        logger.info("Exam ended: exam={} user={} answered={}", examId, userDid, answered);
        return ResponseEntity.ok(Map.of(
                "submitted", true,
                "examId", examId,
                "answeredCount", answered,
                "txHash", "exam-submit-" + UUID.randomUUID()));
    }

    /**
     * GET /api/v1/exams/{examId}/session/audit — full exam audit (admin).
     */
    @GetMapping("/{examId}/session/audit")
    public ResponseEntity<Map<String, Object>> examAudit(
            @PathVariable String examId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        if (roles == null || !roles.contains("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "ADMIN_ROLE_REQUIRED"));
        }
        long activeSessions = sessionExam.values().stream().filter(examId::equals).count();
        return ResponseEntity.ok(Map.of(
                "examId", examId,
                "activeSessions", activeSessions,
                "note", "Full per-question audit available via security events"));
    }

    /** Minimal message wrapper to avoid new DTO proliferation. */
    public record ExamMessage(@NotNull String message) {}
}
