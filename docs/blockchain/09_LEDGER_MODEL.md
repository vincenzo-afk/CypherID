# Ledger Model

Fabric ledger = blockchain (ordered blocks of transactions) + world state (current state snapshot in CouchDB).
Chaincode reads/writes world state. History queries traverse the blockchain.
