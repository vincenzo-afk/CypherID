# Time-Bound Access

AccessPolicy can specify `allowedHours` attribute (e.g., `06-22`).
Chaincode evaluates current timestamp against allowed hours.
Time is passed as parameter (not from system clock — determinism).
