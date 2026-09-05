# Capture Threat Model

See `docs/protection/03_PROTECTION_THREAT_MODEL.md` for full capture threat model.

## Summary
| Capture Method | Protection Effectiveness | Traceability |
|:---|:---|:---|
| Phone camera | Partial (profile-dependent) | Watermark traceable |
| DSLR camera | Low–Partial | Watermark traceable |
| OS screenshot | None (not preventable) | Watermark traceable |
| OS screen recording | None (not preventable) | Partial (watermark may be visible) |
| Browser dev tools canvas | Low (pixel capture possible) | Watermark included |
| VM screen capture | None | Watermark traceable |
