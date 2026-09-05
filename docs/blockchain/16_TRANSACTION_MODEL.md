# Transaction Model

Fabric transaction = proposal + endorsements + orderer submission + commit.
SUBMIT: goes through full lifecycle. EVALUATE: peer-only (read).
Replay protection: nonce per DID stored in world state.
