# Suspicious Activity Workflow

## Trigger
Browser tab hidden during protected document viewing.

## Steps

1. **Browser fires visibilitychange event**
   ```javascript
   document.addEventListener('visibilitychange', () => {
     if (document.hidden) {
       reportEvent('TAB_HIDDEN');
     }
   });
   ```

2. **Frontend reports event**
   - `POST /api/v1/protected-content/session/{id}/event`
   - Body: `{ eventType: "TAB_HIDDEN", timestamp: "...", metadata: {} }`

3. **Backend processes event**
   - ProtectedSessionService increments suspiciousEventCount
   - If count == 1: state → SUSPICIOUS_ACTIVITY
   - If count >= 3: state → CONTENT_OBSCURED

4. **Backend response**
   - Returns: `{ newState: "SUSPICIOUS_ACTIVITY", action: "CONTINUE" }`
   - Or: `{ newState: "CONTENT_OBSCURED", action: "OBSCURE" }`

5. **Frontend acts on response**
   - CONTINUE: increase protection profile intensity; log warning indicator in UI
   - OBSCURE: renderer switches to obscuration overlay

6. **Security event logged**
   - SecurityEventService logs event to PostgreSQL
   - If severity HIGH: writes SecurityAlert on-chain

7. **Audit dashboard updated**
   - WebSocket push to audit dashboard: event entry visible to admins in real-time

## Note
Suspicious activity does NOT automatically terminate the session.
Content is obscured until tab is restored (configurable policy).
