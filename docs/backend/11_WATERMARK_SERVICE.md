# Watermark Service

## Part of
`asset-service` package (`com.cypherid.asset.watermark`)

## Responsibilities
- Generate session-specific watermarks
- Store watermark records in PostgreSQL
- Provide forensic lookup (sessionId → user info) for admin

## Watermark Generation
```java
public SessionWatermark generate(String sessionId, String userDID, String contentId) {
    String displayId = sessionId.substring(0, 8).toUpperCase();
    String userDisplay = "U:" + hashAndTruncate(userDID, 6);
    String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm"));
    String token = generateSecureRandom(8);
    return new SessionWatermark(displayId, userDisplay, contentId, timestamp, token);
}
```

## Privacy
Full DID not in watermark. Forensic lookup requires admin access to map displayId → session → DID.
