# Protected Document UI

## Component
`<ProtectedDocumentViewer sessionToken={token} contentId={id} />`

## Layout
- Full-screen overlay (prevents background interaction)
- Header: document title, session expiry countdown, protection status indicator
- Content area: ProtectedRenderer canvas
- Footer: page navigation (chunked delivery)

## ProtectedRenderer Integration
```jsx
<ProtectedRenderer
  sessionToken={sessionToken}
  contentType="DOCUMENT"
  profile={protectionProfile}
  watermark={sessionWatermark}
  onSecurityEvent={handleSecurityEvent}
  onSessionExpired={handleExpiry}
/>
```

## Security Event Handling
```jsx
function handleSecurityEvent(event) {
  // Log to backend
  api.logSecurityEvent(sessionToken, event);

  // State transition
  if (event.type === 'TAB_HIDDEN' && event.count >= 3) {
    setProtectionState('CONTENT_OBSCURED');
  }
}
```

## Expiry Handling
- 2-minute warning shown before session expiry
- On expiry: content obscured, re-authorization required
- Re-authorization does not skip access evaluation
