# Rendering Fallbacks

## Canvas Unavailable
Fallback: CSS-based protection (user-select, pointer-events, background patterns).
Warning logged. Profile downgraded to LOW.

## WebGL Unavailable
Fallback: Canvas 2D API for all effects.
No functionality loss for Canvas-based techniques.

## requestAnimationFrame Unavailable
Fallback: setInterval-based rendering at 15 fps.
Temporal effects limited to LOW profile.

## Display Refresh Rate Unknown
Temporal effects disabled. Profile automatically limited to MEDIUM spatial-only.

## Web Workers Unavailable
Pattern generation on main thread. Performance warning logged.

## All Fallback Behavior
- Fallback applied silently in production
- Warning logged to SecurityEventService
- Admin dashboard shows active fallback status
- Rendered content remains usable; protection reduced
