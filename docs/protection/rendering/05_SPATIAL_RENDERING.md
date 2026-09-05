# Spatial Rendering

## Concept
Apply spatially varying visual patterns to content that reduce camera and OCR readability while remaining perceptually transparent to human readers.

## Techniques

### 1. Fine-Grain Dithering
Sub-pixel noise at the character level.
Human: reads text without difficulty.
Camera/OCR: noise disrupts character recognition.

### 2. Contrast Modulation
Locally vary text/background contrast in a spatially randomized pattern.
Humans: adapt to local contrast (high readability).
OCR/camera: globally consistent OCR assumptions fail.

### 3. Micro-Pattern Overlay
A semi-transparent pattern (dot pattern, grid, noise) overlaid on content.
Transparency tuned so humans read through it easily.
Camera: pattern interferes with edge detection used by OCR.

### 4. Character-Level Position Jitter
Sub-pixel horizontal/vertical jitter applied to individual characters.
Humans: jitter within ±0.5px is imperceptible.
OCR: character segmentation disrupted.

## Configurable Limits
| Parameter | LOW | MEDIUM | HIGH | EXTREME |
|:---|:---|:---|:---|:---|
| `ditherIntensity` | 0 | 0.05 | 0.15 | 0.30 |
| `contrastVariation` | 0% | 5% | 15% | 30% |
| `patternOpacity` | 0 | 0.05 | 0.15 | 0.25 |
| `characterJitterPx` | 0 | 0.2 | 0.4 | 0.8 |
