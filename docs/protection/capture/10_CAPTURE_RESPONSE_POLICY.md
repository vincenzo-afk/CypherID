# Capture Response Policy

| Event | First Occurrence | Threshold (repeated) |
|:---|:---|:---|
| Tab hidden | SUSPICIOUS_ACTIVITY | 3 in 5min → CONTENT_OBSCURED |
| Focus lost | Log only | 5 in 5min → SUSPICIOUS_ACTIVITY |
| Print dialog | CONTENT_OBSCURED immediately | — |
| Fullscreen exit (exam) | SUSPICIOUS_ACTIVITY | 2 → CONTENT_OBSCURED |
