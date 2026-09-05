# Protected Session Lifecycle

## States
```
[REQUEST]
    ↓
AUTHORIZED (access decision: GRANTED)
    ↓
PROTECTED_VIEW (content being viewed)
    ├──→ SUSPICIOUS_ACTIVITY (browser event detected)
    │         ↓
    │    HEIGHTENED_PROTECTION (increased rendering intensity)
    │
    └──→ SUPPORTED_CAPTURE_EVENT (capture-related browser event)
              ↓
         CONTENT_OBSCURED (content hidden until event clears)
    ↓
EXPIRED (TTL reached or user closes session)
```

## State Transitions
| Event | From | To | Action |
|:---|:---|:---|:---|
| Access granted | — | AUTHORIZED | Issue session token |
| First content request | AUTHORIZED | PROTECTED_VIEW | Begin rendering |
| Tab hidden | PROTECTED_VIEW | SUSPICIOUS_ACTIVITY | Log event, increase protection |
| Focus lost | PROTECTED_VIEW | SUSPICIOUS_ACTIVITY | Log event |
| Tab hidden (repeated) | SUSPICIOUS_ACTIVITY | CONTENT_OBSCURED | Obscure content |
| Tab restored | CONTENT_OBSCURED | PROTECTED_VIEW | Resume (configurable) |
| TTL expired | Any | EXPIRED | Invalidate session |

## Obscuration
When CONTENT_OBSCURED, the browser renderer replaces content with a solid overlay.
Content is NOT re-requested from server during obscuration.
