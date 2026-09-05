package com.cypherid.asset.service.watermark;

import java.util.UUID;

/**
 * SessionWatermark — value object for a session-specific watermark
 * (docs/protection/watermark/02_SESSION_WATERMARK.md).
 * <p>
 * Watermark text format:
 * {@code [DISPLAY-ID] [USER-DISPLAY] [CONTENT-ID] [TIMESTAMP] [TOKEN]}
 * e.g. {@code A3F7B21C U:4a3b DRDO-007 20240101-1430 X9K2M}
 */
public record SessionWatermark(
    UUID id,
    String displayId,
    String userDisplay,
    String contentId,
    String timestampLabel,
    String token
) {
    public String watermarkText() {
        return displayId + " " + userDisplay + " " + contentId + " " + timestampLabel + " " + token;
    }
}