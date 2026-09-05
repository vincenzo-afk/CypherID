# Rolling Shutter Interference

## Background
Most phone cameras (and many webcams) use a rolling shutter that reads pixel rows sequentially from top to bottom over a ~10–33ms window.
If display content changes during this window, captured image shows banding artifacts.

## Technique
Display a horizontal sweep pattern synchronized to estimated camera rolling shutter timing.
Different rows of the display show different states of a pattern sweep.
Camera captures a banded/distorted image; human eye sees integrated average (unaffected).

## Limitations
- Effectiveness depends on display refresh rate vs. camera frame rate ratio
- Not all cameras are rolling shutter (global shutter cameras are unaffected)
- Effectiveness varies with camera distance and angle
- At HIGH/EXTREME profiles, this technique is combined with temporal and spatial techniques

## Implementation
Requires display refresh rate ≥ 60 Hz (typical for modern monitors).
JavaScript `requestAnimationFrame` used to synchronize rendering with display refresh.

## Validation
Effectiveness measured in Camera Resistance Lab. See `docs/camera-resistance-lab/10_CAMERA_FRAME_RATE_TESTING.md`.

## Claim
This technique MAY reduce readability for rolling-shutter cameras under specific conditions.
It does NOT guarantee unreadability. It is one layer in a multi-layer protection stack.
