# Temporal Rendering

## Concept
Vary the rendered content across frames in a way that the human eye integrates into a readable image (persistence of vision) but individual camera frames capture distorted or incomplete content.

## Techniques

### 1. Temporal Dithering
Content brightness values are temporally dithered across frames.
Human eye integrates dithered frames into average brightness (reads correctly).
Camera captures single frame with dithered brightness (partially unreadable).

### 2. Frame Alternation
Alternate between two complementary renderings of the same content.
At high frame rates, human eye sees single stable image.
Camera at lower frame rate captures one alternation (distorted).

### 3. Phase Modulation
Shift the spatial phase of background patterns on each frame.
Human eye adapts; camera captures one phase state.

## Configurable Limits
| Parameter | LOW | MEDIUM | HIGH | EXTREME |
|:---|:---|:---|:---|:---|
| `temporalFrequencyHz` | 0 | 15 | 30 | 60 |
| `brightnessVariationRange` | 0% | ±5% | ±15% | ±30% |
| `alternationDepth` | 0 | 1 | 2 | 4 |

## Safety Constraint
Temporal effects MUST NOT cause visible flicker at frequencies below 3 Hz (photosensitive seizure risk threshold).
All temporal effects operate at 15 Hz or above (above human flicker fusion threshold).
See `15_RENDERING_SAFETY.md`.
