package com.cypherid.asset.service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * ProtectionConfigurationService — protection profile parameters and
 * content-delivery limits (docs/backend/14_PROTECTION_CONFIGURATION_SERVICE.md,
 * docs/protection/profiles/).
 * <p>
 * Profile parameters come verbatim from the profile docs:
 * LOW / MEDIUM / HIGH / EXTREME. Values are hard-coded defaults here;
 * a persistence-backed override layer can be added later.
 */
@Service
public class ProtectionConfigurationService {

    /** Chunk size for protected content delivery (docs/protection/documents/04_DOCUMENT_DELIVERY.md). */
    private final int chunkSizeBytes;

    /** Max chunk requests per session per minute. */
    private final int chunkRateLimitPerMinute;

    /** Event counting window in minutes (docs/protection/capture/10_CAPTURE_RESPONSE_POLICY.md). */
    private final int eventWindowMinutes;

    public ProtectionConfigurationService(
            @Value("${protection.chunk-size-bytes:65536}") int chunkSizeBytes,
            @Value("${protection.chunk-rate-limit-per-minute:120}") int chunkRateLimitPerMinute,
            @Value("${protection.event-window-minutes:5}") int eventWindowMinutes) {
        this.chunkSizeBytes = chunkSizeBytes;
        this.chunkRateLimitPerMinute = chunkRateLimitPerMinute;
        this.eventWindowMinutes = eventWindowMinutes;
    }

    /** Default protection profile per asset classification (docs/protection/profiles/05_PROFILE_SELECTION.md). */
    public String profileForClassification(String classification) {
        if (classification == null) return "MEDIUM";
        return switch (classification) {
            case "UNCLASSIFIED" -> "LOW";
            case "CONFIDENTIAL" -> "MEDIUM";
            case "SECRET"       -> "HIGH";
            case "TOP_SECRET"   -> "EXTREME";
            default             -> "MEDIUM";
        };
    }

    /** Session TTL per profile (minutes), from the profile docs. */
    public long sessionTtlMinutes(String profile) {
        return switch (profile) {
            case "LOW"     -> 60;
            case "MEDIUM"  -> 30;
            case "HIGH"    -> 20;
            case "EXTREME" -> 10;
            default        -> 30;
        };
    }

    /** Watermark opacity per profile (docs/protection/profiles/). */
    public double watermarkOpacity(String profile) {
        return switch (profile) {
            case "LOW"     -> 0.08;
            case "MEDIUM"  -> 0.12;
            case "HIGH"    -> 0.18;
            case "EXTREME" -> 0.25;
            default        -> 0.12;
        };
    }

    /** Temporal flicker frequency (Hz); 0 = disabled (docs/protection/profiles/). */
    public int temporalFrequencyHz(String profile) {
        return switch (profile) {
            case "LOW"     -> 0;
            case "MEDIUM"  -> 15;
            case "HIGH"    -> 30;
            case "EXTREME" -> 60;
            default        -> 15;
        };
    }

    /** Spatial dither intensity (docs/protection/profiles/). */
    public double spatialDitherIntensity(String profile) {
        return switch (profile) {
            case "LOW"     -> 0.0;
            case "MEDIUM"  -> 0.05;
            case "HIGH"    -> 0.15;
            case "EXTREME" -> 0.30;
            default        -> 0.05;
        };
    }

    /** Rolling-shutter interference enabled (docs/protection/profiles/). */
    public boolean rollingShutterEnabled(String profile) {
        return "HIGH".equals(profile) || "EXTREME".equals(profile);
    }

    /** Parameter rotation interval in seconds (docs/protection/profiles/). */
    public long parameterRotationIntervalSeconds(String profile) {
        return switch (profile) {
            case "LOW", "MEDIUM" -> 300;
            case "HIGH"          -> 120;
            case "EXTREME"       -> 60;
            default              -> 300;
        };
    }

    /** Whether content should be obscured on focus loss (docs/protection/profiles/). */
    public boolean obscureOnFocusLoss(String profile) {
        return "HIGH".equals(profile) || "EXTREME".equals(profile);
    }

    /** Full profile parameter map, used by the renderer-facing APIs later. */
    public Map<String, Object> profileParameters(String profile) {
        return Map.of(
                "profile", profile,
                "watermarkOpacity", watermarkOpacity(profile),
                "temporalFrequencyHz", temporalFrequencyHz(profile),
                "spatialDitherIntensity", spatialDitherIntensity(profile),
                "rollingShutterEnabled", rollingShutterEnabled(profile),
                "sessionTTLMinutes", sessionTtlMinutes(profile),
                "parameterRotationIntervalSeconds", parameterRotationIntervalSeconds(profile),
                "obscureOnFocusLoss", obscureOnFocusLoss(profile));
    }

    public int getChunkSizeBytes()          { return chunkSizeBytes; }
    public int getChunkRateLimitPerMinute() { return chunkRateLimitPerMinute; }
    public int getEventWindowMinutes()      { return eventWindowMinutes; }
}