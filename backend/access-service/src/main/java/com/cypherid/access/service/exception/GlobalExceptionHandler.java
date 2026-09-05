package com.cypherid.access.service.exception;

import com.cypherid.access.service.dto.AccessDecisionResponse;
import org.hyperledger.fabric.client.GatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GlobalExceptionHandler — maps exceptions to documented HTTP status codes
 * and error bodies per docs/api/18_ERROR_RESPONSE_MODEL.md.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Access denied → 403 with the decision body documented in
     * docs/api/05_ACCESS_CONTROL_APIS.md.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<AccessDecisionResponse> handleAccessDenied(AccessDeniedException e) {
        logger.warn("Access denied: {} (txHash: {})", e.getReason(), e.getTxHash());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new AccessDecisionResponse(
                        e.getDecision(), null, e.getTxHash(), null, e.getReason()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError(e.getCode(), e.getMessage(), null));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError(e.getCode(), e.getMessage(), null));
    }

    @ExceptionHandler(GatewayException.class)
    public ResponseEntity<ApiError> handleGateway(GatewayException e) {
        logger.error("Fabric gateway error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiError("FABRIC_UNAVAILABLE",
                        "Blockchain network unavailable: " + e.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException e) {
        Map<String, Object> details = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(fe -> details.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("VALIDATION_ERROR", "Invalid request payload", details));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("BAD_REQUEST", e.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception e) {
        logger.error("Unhandled error: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("INTERNAL_ERROR", "Unexpected server error", null));
    }
}