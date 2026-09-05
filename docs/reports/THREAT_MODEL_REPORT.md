# Threat Model Report

**Status:** Living document — update when architecture changes

## Scope
CypherID system including blockchain IAM and camera-resistant protection subsystem.

## Methodology
STRIDE threat analysis per component.

## High-Level Findings
See `docs/security/05_THREAT_CATALOG.md` for full threat catalog.

## Residual Risks
1. OS-level screen recording: not preventable; mitigated by watermarking
2. Physical camera capture: partially mitigated; watermarking provides traceability
3. Compromised user device: not in scope; physical security assumed
4. AI model drift: managed by monitoring alert rate; retraining required over time

## Next Review
After Phase 16 (Security Testing) — update with findings.
