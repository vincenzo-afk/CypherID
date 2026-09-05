# Protection State Machine

## States

```
AUTHORIZED
    │
    ▼
PROTECTED_VIEW
    │
    ├──────────────────────────────────────────────────┐
    │                                                  │
    ▼                                                  ▼
SUSPICIOUS_ACTIVITY                     SUPPORTED_CAPTURE_EVENT
    │                                                  │
    ▼                                                  ▼
HEIGHTENED_PROTECTION                       CONTENT_OBSCURED
    │
    ▼
CONTENT_OBSCURED (after repeated/severe events)
```

## State Definitions

### AUTHORIZED
Session created, access granted, no content requested yet.

### PROTECTED_VIEW
Content is being actively served and rendered with protection profile active.

### SUSPICIOUS_ACTIVITY
A browser-observable event has occurred (e.g., tab hidden, focus lost).
Protection profile intensity increased. Event logged.

### HEIGHTENED_PROTECTION
Repeated suspicious events. Maximum protection profile applied (regardless of configured profile).
Content still visible. Security event logged.

### SUPPORTED_CAPTURE_EVENT
A browser event directly associated with potential capture (e.g., print dialog, repeated focus loss pattern).
Content obscured until event clears and administrator reviews (configurable policy).

### CONTENT_OBSCURED
Content replaced with obscuration overlay. Session not invalidated (user can resume if policy allows).
Security event logged.

## Transition Rules
Configurable via ProtectionConfigurationService.
Default policy defined in `docs/protection/profiles/`.
