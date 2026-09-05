# Results Schema

## Test Result Record (JSON)
```json
{
  "testId": "CR-2024-001",
  "date": "2024-01-01",
  "tester": "anonymous",
  "renderingConfig": {
    "profile": "HIGH",
    "temporalFrequencyHz": 30,
    "spatialDitherIntensity": 0.15,
    "rollingShutterEnabled": true
  },
  "captureMethod": "phone_camera",
  "cameraModel": "Redacted",
  "cameraFrameRate": 30,
  "cameraExposure": "1/60s",
  "displayRefreshRate": 60,
  "distance_cm": 60,
  "angle_degrees": 0,
  "lighting_lux": 300,
  "browserVersion": "Chrome 120",
  "metrics": {
    "ocrAccuracy": 0.23,
    "humanReadabilityScore": 4.5,
    "visualQualityScore": 4.2,
    "renderingFPS": 58,
    "cpuOverheadPercent": 8
  },
  "notes": ""
}
```

## Interpretation
`ocrAccuracy: 0.23` means 23% of characters were correctly recognized by OCR on the captured image.
Baseline (no protection) ocrAccuracy for comparison must always be included in report.

## Fabrication Prohibition
Results MUST be from actual measurements. Estimated or assumed results are prohibited.
