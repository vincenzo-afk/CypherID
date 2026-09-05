package com.cypherid.asset.service.dto;

/**
 * WatermarkDto — watermark display fields exposed to the renderer
 * (docs/api/09_PROTECTED_CONTENT_APIS.md). The random token is kept
 * server-side only.
 */
public record WatermarkDto(
    String displayId,
    String userDisplay,
    String timestamp
) {}