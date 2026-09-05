# Protected Video UI

## Component
`<ProtectedVideoViewer sessionToken={token} contentId={id} />`

## Layout
- Full-screen overlay
- Header: video title, session expiry, protection status
- Video area: Canvas-rendered video frames with protection overlays
- Controls: Play/Pause, Volume, Seek (limited seek range per policy)
- Footer: watermark indicator

## Watermark
Persistent watermark overlaid on video canvas.
Position rotates every 60 seconds.

## Capture Monitoring
Same events as document mode.
Focus loss: video paused + SUSPICIOUS_ACTIVITY state.
