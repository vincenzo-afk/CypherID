# ADR-0002: Hyperledger Fabric Selection

**Status:** Accepted

## Context
Need a blockchain platform for permissioned identity and access management suitable for defense and government use.

## Decision
Use Hyperledger Fabric 2.5 (LTS).

## Rationale
- Permissioned: all participants have known identities (required for defense)
- Java chaincode: primary language requirement met
- CouchDB world state: rich query support for ABAC policy evaluation
- Private Data Collections: confidential metadata sharing between orgs
- Enterprise maturity: Hyperledger is widely deployed in enterprise
- No cryptocurrency: no financial token risk

## Alternatives Considered
- Ethereum (public): rejected — public chain not suitable for classified data
- Corda: rejected — Java but limited chaincode flexibility
- IOTA: rejected — not suitable for access control use case

## Consequences
- Complex network setup (Fabric CA, peers, orderer, channels)
- Java chaincode determinism constraints (no random, no system time)
- Requires crypto-config generation before deployment
