# Video Rendering

Video rendered on Canvas (not native video element) to enable protection overlays.
Performance: Canvas rendering may reduce frame rate on low-end devices.
Fallback: if Canvas performance is below 24fps, switch to native video element with CSS overlay only.
