# False Positive Policy

Browser events have high false positive rates (notification clicks, OS alerts).
Policy: single event → log + SUSPICIOUS_ACTIVITY (not CONTENT_OBSCURED).
Only repeated events within a short window → escalate state.
Admin can review false positives in audit log and clear flags.
