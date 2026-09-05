# Test Acceptance Criteria

## Definition of Done for Testing

A feature is complete when:

1. Unit tests written and passing (coverage target met)
2. Integration tests written and passing
3. Security tests passing (all AT-xx tests for relevant feature)
4. API tests passing for all endpoints in feature scope
5. Browser tests passing if frontend feature
6. No HIGH or CRITICAL severity security findings unresolved
7. Performance within defined limits (see `docs/performance/`)
8. Accessibility tests passing (WCAG 2.1 AA for UI features)
9. Documentation updated

## Security Test Gate
No feature ships with:
- Authorization bypass (any AT-xx failure)
- Session fixation or hijacking vulnerability
- Sensitive data exposed in API response
- Secret or key exposed in logs or browser

## Camera Resistance Claims
No camera resistance effectiveness claim is made in documentation or UI without:
- Measured result from Camera Resistance Lab
- Test configuration documented
- Limitation statement included
