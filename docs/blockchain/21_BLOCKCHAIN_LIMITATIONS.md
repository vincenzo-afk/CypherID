# Blockchain Limitations

## Not a Database
Fabric is not a general-purpose database. Chaincode queries are limited to key lookups and CouchDB rich queries. Complex analytical queries should be served from PostgreSQL.

## Throughput
Hyperledger Fabric supports hundreds of transactions per second per channel — sufficient for identity and access management workloads, not suitable for high-frequency trading or real-time streaming.

## Finality Latency
Transaction finality requires ordering + block commit — typically 0.5–2 seconds. Interactive access requests should cache evaluation results.

## Not Encryption
Transaction hashes and blockchain records are NOT encryption. They provide integrity proof, not confidentiality.

## No Secret Distribution
The blockchain MUST NOT be used to distribute encryption keys to clients. See `docs/architecture/08_TRUST_BOUNDARIES.md`.

## Chaincode Determinism
Chaincode must be deterministic. No random number generation, no system time calls, no external HTTP calls.

## Storage Cost
All on-chain data is replicated to every peer. Keep on-chain data minimal; use IPFS for large files.
