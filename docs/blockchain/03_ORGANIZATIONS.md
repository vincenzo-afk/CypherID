# Organizations

## Org1 — BEL (Bharat Electronics Limited)
- Role: Primary system operator
- MSP ID: Org1MSP
- Admin: Manages system-wide policies and organization onboarding
- Endorser: All chaincode transactions

## Org2 — DRDO
- Role: Partner organization / VC issuer
- MSP ID: Org2MSP
- Admin: Issues security clearance VCs to DRDO employees

## Org3 — MoD (Ministry of Defence)
- Role: Partner organization / VC issuer
- MSP ID: Org3MSP
- Admin: Issues MoD-level clearance VCs

## Adding Organizations
New organizations require:
1. Fabric CA enrollment
2. MSP configuration update
3. Channel configuration update (requires majority approval)
4. Chaincode re-endorsement policy update if needed
