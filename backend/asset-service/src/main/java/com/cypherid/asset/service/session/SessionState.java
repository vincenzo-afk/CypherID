package com.cypherid.asset.service.session;

import com.google.gson.annotations.SerializedName;

/**
 * SessionState — hot session state stored in Redis under session:{sessionId}
 * (docs/data/11_PROTECTED_SESSION_DATA_MODEL.md). Mirrored to PostgreSQL for audit.
 */
public record SessionState(
    @SerializedName("sessionId")  String sessionId,
    @SerializedName("userDID")    String userDID,
    @SerializedName("contentId")  String contentId,
    @SerializedName("contentType") String contentType,
    @SerializedName("profile")    String profile,
    @SerializedName("state")      String state,
    @SerializedName("chunkCount") int chunkCount,
    @SerializedName("suspiciousEventCount") int suspiciousEventCount,
    @SerializedName("expiresAt")  String expiresAt
) {
    public SessionState withState(String newState) {
        return new SessionState(sessionId, userDID, contentId, contentType, profile,
                newState, chunkCount, suspiciousEventCount, expiresAt);
    }

    public SessionState withChunkCount(int count) {
        return new SessionState(sessionId, userDID, contentId, contentType, profile,
                state, count, suspiciousEventCount, expiresAt);
    }

    public SessionState withSuspiciousEventCount(int count) {
        return new SessionState(sessionId, userDID, contentId, contentType, profile,
                state, chunkCount, count, expiresAt);
    }
}