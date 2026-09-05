# Protection Objectives

## Primary Objective
```
Human Readability  → MAXIMIZE
Camera Readability → MINIMIZE
```

## Secondary Objectives
1. Do not make content unreadable to legitimate users
2. Do not cause dangerous visual flicker
3. Degrade gracefully when browser features are unavailable
4. Generate unique session-specific parameters per viewing session
5. Watermark every protected session for forensic traceability
6. Log all security-relevant events without storing unnecessary personal data

## Measurable Success Criteria
- Legitimate human reads content without assistance: ✓ (no unusual effort required)
- Camera-captured image is distorted/partial/unreadable: measured in Camera Resistance Lab
- OCR on captured image recovers < X% of text: measured per profile (see camera-resistance-lab/)
- Watermark visible in captured image: ✓ (must survive camera capture at HIGH/EXTREME profiles)
- Session expires within configured TTL: ✓

## Out of Scope for This Objective
- Preventing a user who can see the screen from memorizing content
- Preventing capture by an adversary with physical control of the display hardware
- Preventing OS-level screen recording (this is monitored where browser allows, not prevented)
