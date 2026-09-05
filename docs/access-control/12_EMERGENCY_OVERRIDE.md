# Emergency Override

## Purpose
In critical operational situations, a SUPER_ADMIN may grant emergency access bypassing normal clearance requirements.

## Authorization
Only the `SUPER_ADMIN` role can invoke emergency override.

## Audit
Emergency override is FULLY AUDITED:
- Recorded on-chain immediately
- Visible in real-time on the Audit Dashboard
- Cannot be hidden or retroactively removed
- Triggers AI anomaly service alert

## Restrictions
- Override grants access for a maximum of 1 hour (configurable)
- Override is resource-specific (cannot grant global access)
- Override reason must be provided

## Post-Override Review
After override session expires, a mandatory review flag is set.
System generates a compliance report for the override event.
