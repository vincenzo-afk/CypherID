# Test Matrix

## Variables

### Rendering Configuration
- Baseline (no protection)
- LOW profile
- MEDIUM profile
- HIGH profile
- EXTREME profile
- Individual techniques in isolation (temporal only, spatial only, rolling shutter only)

### Camera Variables
- Frame rate: 24fps, 30fps, 60fps, 120fps, 240fps
- Exposure: auto, 1/30s, 1/60s, 1/120s, 1/240s, 1/500s
- ISO: auto, 100, 400, 1600

### Physical Variables
- Distance: 30cm, 60cm, 100cm, 150cm
- Angle: 0°, 15°, 30°, 45°
- Lighting: dark, normal indoor, bright indoor, outdoor

### Display Variables
- Refresh rate: 60Hz, 120Hz, 144Hz

### Capture Method
- Physical camera (phone)
- Physical camera (dedicated)
- Screenshot (OS tool)
- Screen recording (OS tool)
- Browser-based screen capture

### Content Type
- Text document (English, standard font)
- Text document (small font)
- Numeric content
- Mixed text + image

## Metrics Per Test
- OCR accuracy on captured image (% characters correctly recognized)
- Human readability score (1–5)
- Visual quality score (1–5)
- Rendering frame rate
- CPU overhead %
