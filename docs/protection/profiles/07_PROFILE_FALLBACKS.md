# Profile Fallbacks

When browser features unavailable:
- Canvas unavailable → CSS-only protection, profile downgraded to LOW
- WebGL unavailable → Canvas 2D fallback, no functional loss
- Refresh rate unknown → temporal effects disabled, profile capped at MEDIUM
- requestAnimationFrame unavailable → setInterval at 15 fps

All fallbacks logged to SecurityEventService and visible in admin dashboard.
