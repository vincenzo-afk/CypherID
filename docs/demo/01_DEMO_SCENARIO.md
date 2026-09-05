# Demo Scenario

## Narrative
"A DRDO employee wants to access a classified document. An unauthorized employee tries to access it. An admin grants clearance. We show the full audit trail."

## Characters
- **Arjun** — DRDO employee, Security Clearance Level 3
- **Priya** — BEL employee, no DRDO clearance
- **Admin** — System administrator

## Demo Flow (5 minutes)

### Minute 1: Identity
1. Show Arjun's Identity Wallet: DID, VCs (Security Clearance Level 3, DRDO Employee)
2. Show DID document with blockchain transaction hash
3. Show Priya's wallet: DID, only BEL Employee VC (no security clearance)

### Minute 2: Asset and Access Denial
1. Show classified document in Asset Hub: DRDO-DESIGN-007 (SECRET)
2. Log in as Priya → request access to DRDO-DESIGN-007
3. Access DENIED — reason: INSUFFICIENT_CLEARANCE
4. Show blockchain tx hash of the denial event
5. Denial visible in Audit Dashboard

### Minute 3: Access Grant and Protected View
1. Admin issues Security Clearance Level 3 VC to Priya (if scenario requires)
2. — OR — Log in as Arjun (who already has clearance)
3. Request access to DRDO-DESIGN-007
4. Access GRANTED — show blockchain tx hash
5. Protected document viewer opens
6. Show watermark overlay on content
7. Point camera at screen — content appears distorted

### Minute 4: AI Anomaly and Audit
1. Simulate rapid access pattern (trigger AI anomaly alert)
2. Show AI alert in Audit Dashboard with on-chain SecurityAlert tx hash
3. Show full audit log: denial → grant → anomaly alert
4. Export PDF audit report with embedded tx hashes

### Minute 5: System Health
1. Show Admin Panel: peer status, block height across all 3 orgs
2. Show transaction throughput graph
3. Close with architecture summary

## Pre-Demo Setup
See `docs/demo/` individual files for data seeding steps per scenario.
