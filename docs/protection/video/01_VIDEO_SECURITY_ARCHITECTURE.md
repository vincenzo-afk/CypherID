# Video Security Architecture

## Video Storage
- Video files stored encrypted in IPFS (same as documents)
- AES-256-GCM encryption per video asset

## Streaming Model
- Video is not served as a direct file download
- Video is served as time-limited, authenticated chunks
- Each chunk request validates session token

## Watermarking
- Session watermark overlaid on video canvas renderer
- Watermark position randomized per session and rotates during playback

## Anti-Download
- Video data is not served via a direct URL (no src attribute pointing to decrypted file)
- Video rendered via Canvas/MediaSource API
- Right-click and download context menu disabled on video element
- Limitation: OS-level tools can still capture screen video

## Capture Monitoring
- Same browser-observable events as document mode
- Focus loss during video: pause + SUSPICIOUS_ACTIVITY state

## Expiring Sessions
- Default video session TTL: 120 minutes
- Configurable per asset
- Session not renewable without re-authorization

## Claim
Browser JavaScript CANNOT completely prevent screen recording of video.
OS-level tools are beyond browser control.
