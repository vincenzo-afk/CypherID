# Camera-Resistance Renderer

## Overview
The Camera-Resistance Renderer is a browser-side rendering engine that applies visual techniques designed to:
- Maximize readability for the human viewer looking at the display
- Minimize readability of content captured by cameras, screen recorders, and OCR

## Technology Stack
Primary: HTML Canvas 2D API
Secondary: WebGL (for advanced temporal effects where supported)
Fallback: CSS-based techniques (where Canvas/WebGL unavailable)

## Architecture
```
ProtectedRenderer (main class)
    ├── TemporalEngine — frame-rate based modulation
    ├── SpatialEngine  — pixel/character-level dithering and patterns
    ├── PatternEngine  — dynamic background/foreground patterns
    ├── WatermarkLayer — session watermark overlay
    └── ContentLayer   — actual content rendering
```

## Rendering Loop
```javascript
// Pseudocode
function renderFrame(timestamp) {
  const params = sessionParams.getForTimestamp(timestamp);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Background pattern (spatial interference)
  patternEngine.drawBackground(ctx, params);

  // 2. Content with temporal modulation
  contentLayer.draw(ctx, content, params);

  // 3. Spatial dithering overlay
  spatialEngine.drawOverlay(ctx, params);

  // 4. Watermark (persistent, position changes per tick)
  watermarkLayer.draw(ctx, sessionWatermark, params);

  requestAnimationFrame(renderFrame);
}
```

## Session Parameters
All rendering parameters are derived from `sessionSeed` provided by backend.
Parameters change every `parameterRotationInterval` milliseconds.

## Human Readability Guarantee
Human readability is the PRIMARY constraint. Any technique that renders content unreadable to humans at normal viewing conditions MUST NOT be used.
All techniques must be validated against the human readability criteria in `02_HUMAN_READABILITY.md`.
