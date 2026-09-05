# Security Event UI

## Security Event Notification
When browser event detected (tab hidden, focus lost):
- Amber toast notification: "⚠ Security event detected — tab hidden"
- Event logged to backend

## Content Obscured State
When CONTENT_OBSCURED:
- Full-screen overlay with message: "Content protected — security event detected"
- Contact supervisor button (exam mode)
- Wait for auto-resume (document mode, if policy allows)
- Re-authorize button (if policy requires re-auth)

## Admin Security Alert
Admin receives real-time notification when HIGH severity event occurs.
Audit Dashboard shows alert entry with: event type, session ID, user DID, timestamp, tx hash.
