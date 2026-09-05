# ADR-0011: Browser Security Limitations

**Status:** Accepted

## Context
The system must honestly document what browser-based content protection can and cannot achieve.

## Decision
The system documentation, UI, and marketing MUST:
1. Never claim "screenshots are prevented"
2. Never claim "screen recording is prevented"
3. Never claim "camera capture is impossible"
4. Always describe protection as: "camera-resistant rendering designed to reduce readability"
5. Document all limitations in `docs/protection/capture/08_CAPTURE_LIMITATIONS.md`

## Rationale
Browser JavaScript cannot access OS-level capture tools.
Making false security claims is dishonest and misleads users about their actual security posture.
Accurate limitation documentation is a security requirement, not a weakness.

## Consequences
Marketing materials must be reviewed against this ADR.
Any agent or developer who adds false security claims MUST correct them.
The Camera Resistance Lab exists specifically to replace assumptions with measurements.
