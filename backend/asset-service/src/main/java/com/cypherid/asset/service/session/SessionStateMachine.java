package com.cypherid.asset.service.session;

import org.springframework.stereotype.Component;

/**
 * SessionStateMachine — authoritative state transition logic for protected
 * sessions (docs/protection/states/01_STATE_MACHINE.md,
 * docs/protection/capture/10_CAPTURE_RESPONSE_POLICY.md,
 * docs/protection/07_PROTECTED_SESSION_LIFECYCLE.md).
 * <p>
 * Pure logic (no I/O) so it is fully unit-testable. The backend is
 * authoritative for state; the frontend mirrors it.
 */
@Component
public class SessionStateMachine {

    // ─── States ───────────────────────────────────────────────────────────────
    public static final String STATE_AUTHORIZED            = "AUTHORIZED";
    public static final String STATE_PROTECTED_VIEW        = "PROTECTED_VIEW";
    public static final String STATE_SUSPICIOUS_ACTIVITY   = "SUSPICIOUS_ACTIVITY";
    public static final String STATE_HEIGHTENED_PROTECTION = "HEIGHTENED_PROTECTION";
    public static final String STATE_SUPPORTED_CAPTURE_EVENT = "SUPPORTED_CAPTURE_EVENT";
    public static final String STATE_CONTENT_OBSCURED      = "CONTENT_OBSCURED";
    public static final String STATE_EXPIRED               = "EXPIRED";

    // ─── Event types (docs/protection/capture/07_SUPPORTED_CAPTURE_EVENTS.md) ─
    public static final String EVT_TAB_HIDDEN       = "TAB_HIDDEN";
    public static final String EVT_TAB_RESTORED     = "TAB_RESTORED";
    public static final String EVT_FOCUS_LOST       = "FOCUS_LOST";
    public static final String EVT_PRINT_DIALOG     = "PRINT_DIALOG";
    public static final String EVT_FULLSCREEN_EXIT  = "FULLSCREEN_EXIT";
    public static final String EVT_SESSION_OBSCURED = "SESSION_OBSCURED";
    public static final String EVT_AI_ANOMALY       = "AI_ANOMALY";
    public static final String EVT_EMERGENCY_OVERRIDE = "EMERGENCY_OVERRIDE";

    // ─── Actions returned to the frontend ─────────────────────────────────────
    public static final String ACTION_CONTINUE = "CONTINUE";
    public static final String ACTION_OBSCURE  = "OBSCURE";
    public static final String ACTION_RESUME   = "RESUME";

    /** Result of applying an event: new session state + frontend action. */
    public record Transition(String newState, String action) {}

    /**
     * Applies a browser security event to the current session state.
     *
     * @param countInWindow number of occurrences of this event type within the
     *                      configured window (already includes the current one)
     */
    public Transition apply(String currentState, String eventType, int countInWindow) {
        if (STATE_EXPIRED.equals(currentState)) {
            return new Transition(STATE_EXPIRED, ACTION_CONTINUE);
        }

        return switch (eventType) {
            // Tab hidden: 1st → SUSPICIOUS, 2nd → HEIGHTENED, 3+ in window → OBSCURED
            case EVT_TAB_HIDDEN -> {
                if (STATE_CONTENT_OBSCURED.equals(currentState)) {
                    yield new Transition(STATE_CONTENT_OBSCURED, ACTION_OBSCURE);
                }
                if (countInWindow >= 3) {
                    yield new Transition(STATE_CONTENT_OBSCURED, ACTION_OBSCURE);
                }
                if (countInWindow == 2) {
                    yield new Transition(STATE_HEIGHTENED_PROTECTION, ACTION_CONTINUE);
                }
                yield new Transition(STATE_SUSPICIOUS_ACTIVITY, ACTION_CONTINUE);
            }

            // Focus lost: log only until 5 occurrences in window
            case EVT_FOCUS_LOST -> countInWindow >= 5
                    ? new Transition(STATE_SUSPICIOUS_ACTIVITY, ACTION_CONTINUE)
                    : new Transition(currentState, ACTION_CONTINUE);

            // Print dialog → obscure immediately
            case EVT_PRINT_DIALOG -> new Transition(STATE_CONTENT_OBSCURED, ACTION_OBSCURE);

            // Fullscreen exit: 1st → SUSPICIOUS, 2+ → OBSCURED
            case EVT_FULLSCREEN_EXIT -> countInWindow >= 2
                    ? new Transition(STATE_CONTENT_OBSCURED, ACTION_OBSCURE)
                    : new Transition(STATE_SUSPICIOUS_ACTIVITY, ACTION_CONTINUE);

            // Tab restored → resume viewing (configurable)
            case EVT_TAB_RESTORED -> (STATE_CONTENT_OBSCURED.equals(currentState)
                    || STATE_SUSPICIOUS_ACTIVITY.equals(currentState)
                    || STATE_HEIGHTENED_PROTECTION.equals(currentState))
                    ? new Transition(STATE_PROTECTED_VIEW, ACTION_RESUME)
                    : new Transition(currentState, ACTION_CONTINUE);

            case EVT_SESSION_OBSCURED -> new Transition(STATE_CONTENT_OBSCURED, ACTION_OBSCURE);

            case EVT_AI_ANOMALY -> new Transition(STATE_SUSPICIOUS_ACTIVITY, ACTION_CONTINUE);

            // Emergency override is an access grant event, not a session-state event
            case EVT_EMERGENCY_OVERRIDE -> new Transition(currentState, ACTION_CONTINUE);

            default -> new Transition(currentState, ACTION_CONTINUE);
        };
    }
}