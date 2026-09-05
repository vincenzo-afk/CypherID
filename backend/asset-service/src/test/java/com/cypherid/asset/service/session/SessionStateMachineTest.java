package com.cypherid.asset.service.session;

import org.junit.jupiter.api.Test;

import static com.cypherid.asset.service.session.SessionStateMachine.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * SessionStateMachineTest — verifies event→state transitions per
 * docs/protection/capture/10_CAPTURE_RESPONSE_POLICY.md and
 * docs/protection/07_PROTECTED_SESSION_LIFECYCLE.md.
 */
class SessionStateMachineTest {

    private final SessionStateMachine machine = new SessionStateMachine();

    @Test
    void tabHidden_firstOccurrence_suspiciousActivity() {
        Transition t = machine.apply(STATE_PROTECTED_VIEW, EVT_TAB_HIDDEN, 1);
        assertEquals(STATE_SUSPICIOUS_ACTIVITY, t.newState());
        assertEquals(ACTION_CONTINUE, t.action());
    }

    @Test
    void tabHidden_secondOccurrence_heightenedProtection() {
        Transition t = machine.apply(STATE_SUSPICIOUS_ACTIVITY, EVT_TAB_HIDDEN, 2);
        assertEquals(STATE_HEIGHTENED_PROTECTION, t.newState());
    }

    @Test
    void tabHidden_thirdOccurrence_obscured() {
        Transition t = machine.apply(STATE_SUSPICIOUS_ACTIVITY, EVT_TAB_HIDDEN, 3);
        assertEquals(STATE_CONTENT_OBSCURED, t.newState());
        assertEquals(ACTION_OBSCURE, t.action());
    }

    @Test
    void focusLost_belowThreshold_logOnly() {
        Transition t = machine.apply(STATE_PROTECTED_VIEW, EVT_FOCUS_LOST, 3);
        assertEquals(STATE_PROTECTED_VIEW, t.newState());
        assertEquals(ACTION_CONTINUE, t.action());
    }

    @Test
    void focusLost_atThreshold_suspiciousActivity() {
        Transition t = machine.apply(STATE_PROTECTED_VIEW, EVT_FOCUS_LOST, 5);
        assertEquals(STATE_SUSPICIOUS_ACTIVITY, t.newState());
    }

    @Test
    void printDialog_obscuresImmediately() {
        Transition t = machine.apply(STATE_PROTECTED_VIEW, EVT_PRINT_DIALOG, 1);
        assertEquals(STATE_CONTENT_OBSCURED, t.newState());
        assertEquals(ACTION_OBSCURE, t.action());
    }

    @Test
    void fullscreenExit_first_suspicious_second_obscured() {
        assertEquals(STATE_SUSPICIOUS_ACTIVITY, machine.apply(STATE_PROTECTED_VIEW, EVT_FULLSCREEN_EXIT, 1).newState());
        assertEquals(STATE_CONTENT_OBSCURED, machine.apply(STATE_SUSPICIOUS_ACTIVITY, EVT_FULLSCREEN_EXIT, 2).newState());
    }

    @Test
    void tabRestored_resumesFromObscured() {
        Transition t = machine.apply(STATE_CONTENT_OBSCURED, EVT_TAB_RESTORED, 0);
        assertEquals(STATE_PROTECTED_VIEW, t.newState());
        assertEquals(ACTION_RESUME, t.action());
    }

    @Test
    void sessionObscured_obscures() {
        assertEquals(STATE_CONTENT_OBSCURED, machine.apply(STATE_PROTECTED_VIEW, EVT_SESSION_OBSCURED, 1).newState());
    }

    @Test
    void aiAnomaly_suspiciousActivity() {
        assertEquals(STATE_SUSPICIOUS_ACTIVITY, machine.apply(STATE_PROTECTED_VIEW, EVT_AI_ANOMALY, 1).newState());
    }

    @Test
    void expired_stateIsTerminal() {
        Transition t = machine.apply(STATE_EXPIRED, EVT_TAB_HIDDEN, 1);
        assertEquals(STATE_EXPIRED, t.newState());
    }
}