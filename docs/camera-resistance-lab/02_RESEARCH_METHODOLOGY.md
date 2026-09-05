# Research Methodology

## Principle
Measure, don't estimate. All results must be reproducible.

## Test Environment Documentation
For each test run, record:
- Display model and resolution
- Display refresh rate
- Camera/device model
- Camera settings (frame rate, exposure, ISO, focus mode)
- Capture distance (cm)
- Viewing angle (degrees from perpendicular)
- Ambient lighting conditions (lux)
- Browser and version
- Rendering configuration tested
- Date and tester

## Measurement Tools
- Human readability: human subject panel rating (1–5 scale) + character recognition accuracy
- Camera readability: captured image analysis + OCR tool (Tesseract) accuracy
- Performance: browser performance API (frame rate, memory, CPU)

## Sample Size
Minimum 30 captures per configuration for statistical significance.
Human readability: minimum 5 human subjects per configuration.

## Randomization
Content rendered in random order. Testers blinded to configuration.

## Baseline
Always test baseline (no protection) before testing configurations.
Results expressed as relative reduction from baseline.

## Reporting
See `26_LAB_REPORTING_STANDARD.md`.
