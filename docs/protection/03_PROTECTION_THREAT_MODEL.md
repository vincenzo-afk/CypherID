# Protection Threat Model

## Threat Actors

### T1: Curious Insider
Motivation: Share exam questions or classified documents with unauthorized parties.
Method: Phone camera pointed at display.
Sophistication: Low.

### T2: Organized Leaker
Motivation: Systematic exfiltration of exam content or classified materials.
Method: Phone camera, screen recording, multiple sessions.
Sophistication: Medium.

### T3: Technical Adversary
Motivation: Extract protected content for analysis or reproduction.
Method: Screen recording, browser developer tools, network interception, OCR on captures.
Sophistication: High.

### T4: Determined Adversary
Motivation: Complete exfiltration of protected content.
Method: Custom browser extension, modified browser, VM screen capture, side-channel.
Sophistication: Very High.

## Scope of Protection

| Threat | Protection Effective? | Notes |
|:---|:---|:---|
| T1 — Phone camera | Partial to High | Depends on profile and display conditions |
| T2 — Organized camera | Partial | Watermark enables traceability |
| T3 — Screen recording | Partial | Browser-observable events monitored; OS-level cannot be detected |
| T3 — Developer tools | Partial | Content not in DOM as plaintext |
| T4 — Modified browser | Low | Cannot protect against compromised browser |
| T4 — VM capture | None | OS-level; not browser-detectable |

## What Watermarking Addresses
Even when capture succeeds, watermarks enable identification of the originating session.
This provides deterrence and forensic capability rather than prevention.
