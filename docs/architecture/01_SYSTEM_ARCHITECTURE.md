# System Architecture

## Layer Overview

```
CLIENT LAYER
  └── React 18 + Material-UI (Web Application)
         │
API GATEWAY (Spring Cloud Gateway)
  └── Rate Limiting | JWT Validation | SSL Termination
         │
APPLICATION LAYER (Spring Boot 3.x)
  ├── Identity Service (DID Management)
  ├── Access Control Service
  ├── Asset Service (Tokenization)
  ├── Audit Service
  ├── Policy Engine
  ├── Notification Service
  ├── Protection Policy Service
  ├── Protected Session Service
  ├── Watermark Service
  ├── Protected Content Service
  └── Security Event Service
         │
BLOCKCHAIN LAYER (Hyperledger Fabric 2.5)
  ├── Identity Chaincode (Java) — DID CRUD, VC Verify
  ├── Access Control Chaincode (Java) — RBAC/ABAC, Policy Eval
  └── Asset Registry Chaincode (Java) — Mint/Burn/Transfer
         │
PERSISTENCE LAYER
  ├── PostgreSQL 16 (User/Asset Metadata)
  ├── CouchDB (Fabric World State)
  └── IPFS (Encrypted File Storage)

SUPPORTING SERVICES
  ├── Apache Kafka (Async Event Streaming)
  ├── Redis (Sessions, JWT Blacklist, Nonce Cache)
  └── Python FastAPI (AI Anomaly Detection Microservice)
```

## Hackathon 48-Hour Roadmap

| Hours | Phase | Deliverables |
|:---|:---|:---|
| 0–4h | Setup | Docker Compose: Fabric (3 orgs), CouchDB, PostgreSQL, IPFS, Kafka, Redis |
| 4–10h | Chaincode | 3 Java chaincodes + unit tests |
| 10–18h | Backend | 5 Spring Boot services, Fabric Gateway, JWT, REST APIs |
| 18–26h | Frontend | React: Login, DID Wallet, Asset Upload, Access Request, Admin Panel |
| 26–32h | Integration | End-to-end: Register → Issue DID → Upload Asset → Request Access → Audit |
| 32–38h | Security + AI | AES encryption, IPFS, Python anomaly service, Kafka streaming |
| 38–44h | Demo Data | DRDO scenario: employee, classified doc, denial, grant, audit trail |
| 44–48h | Pitch | Architecture poster, PPT, 5-min demo script, deployment |
