# Session Watermark

## Generation
WatermarkService generates a unique watermark for each protected session:

```java
// WatermarkService pseudocode
public SessionWatermark generate(String sessionId, String userDID, String contentId) {
    String displayId = sessionId.substring(0, 8).toUpperCase();
    String userDisplay = hashAndTruncate(userDID, 6);
    String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm"));
    String token = generateSecureRandom(8);

    return new SessionWatermark(displayId, userDisplay, contentId, timestamp, token);
}
```

## Watermark Text
Format: `[SESSION-ID] [USER-DISPLAY] [CONTENT-ID] [TIMESTAMP] [TOKEN]`
Example: `A3F7B21C U:4a3b DRDO-007 20240101-1430 X9K2M`

## Display
- Repeated tiling across content area
- Opacity: 0.12 (configurable, range 0.08–0.25)
- Rotation: 25 degrees
- Position: randomized within session, rotates every 60 seconds

## Visibility in Captures
Watermark must remain readable in camera-captured images at HIGH and EXTREME profiles.
Tested in Camera Resistance Lab per `docs/camera-resistance-lab/`.
