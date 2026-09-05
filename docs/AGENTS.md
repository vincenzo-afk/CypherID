# AGENTS.md — Master Instruction Document for All Coding Agents

## READ THIS FILE FIRST

Every coding agent working on CypherID MUST read this file before writing any code.

---

## Mandatory Reading Order

1. `docs/AGENTS.md` (this file)
2. `docs/00_README.md`
3. `docs/01_PROJECT_CHARTER.md`
4. `docs/05_SCOPE.md`
5. `docs/06_NON_GOALS.md`
6. `docs/07_REQUIREMENTS.md`

Before modifying any subsystem:
- Read that subsystem's `00_*_INDEX.md`
- Read its architecture document
- Read its security document
- Read its relevant workflow documents
- Read its API/data contracts

---

## Agent Priorities (in strict order)

1. Security
2. Correctness
3. Authorization
4. Data confidentiality
5. Functional requirements
6. Reliability
7. Performance
8. Accessibility
9. UX
10. Convenience

---

## NEVER

- Invent APIs not documented in `docs/api/`
- Invent browser capabilities not in `docs/protection/capture/02_BROWSER_OBSERVABLE_EVENTS.md`
- Invent cryptographic primitives — use documented algorithms only
- Weaken authorization logic
- Expose protected source data unnecessarily to the browser
- Treat blockchain transaction hashes as encryption
- Claim screenshots are universally preventable
- Claim camera capture is impossible
- Fabricate benchmark results in the Camera Resistance Lab
- Bypass or delete tests
- Silently change architecture without updating documentation

---

## When Uncertain

1. Inspect documentation first
2. Inspect existing implementation second
3. Make the smallest safe change
4. Update documentation
5. Add or update tests

---

## Implementation Order (Phases)

| Phase | Area |
|:---|:---|
| 0 | Repository + documentation understanding |
| 1 | Infrastructure (Docker, Compose) |
| 2 | Fabric network (peers, orderer, CA) |
| 3 | Identity / DID / VC (chaincode + service) |
| 4 | RBAC + ABAC (access control chaincode + service) |
| 5 | Asset management + encrypted storage |
| 6 | Backend APIs |
| 7 | Protected session infrastructure |
| 8 | Protected document renderer |
| 9 | Watermarking |
| 10 | Capture monitoring |
| 11 | Exam protection |
| 12 | Video protection |
| 13 | Camera-Resistance Lab |
| 14 | AI anomaly detection |
| 15 | Frontend integration |
| 16 | Security testing |
| 17 | Performance testing |
| 18 | End-to-end validation |
| 19 | Demo preparation |

---

## Key Architectural Constraint — Key Distribution

The blockchain ledger MUST NOT be used to return document decryption keys to clients.

Correct trust flow:
```
User → Spring Security → Authorization Service (DID + VC + RBAC + ABAC + policy)
  → Protected Session Service → Authorized Content Delivery → Encrypted Content
  → Browser-side protected renderer
```

Key management (generation, wrapping, rotation, session binding, expiration, revocation)
is handled by `ProtectedSessionService` and `ProtectedContentService`, NOT by chaincode.

The ledger establishes: authorization state, ownership, provenance, policy state, audit evidence.

---

## Documentation Dependency Hierarchy

```
AGENTS.md
    └── 00_README.md
            ├── architecture/
            ├── blockchain/
            ├── identity/
            ├── access-control/
            ├── assets/
            ├── protection/
            ├── camera-resistance-lab/
            ├── backend/
            ├── frontend/
            ├── api/
            ├── data/
            ├── security/
            ├── ai/
            ├── infrastructure/
            ├── testing/
            └── operations/
```

Each subsystem follows: INDEX → ARCHITECTURE → DATA MODEL → API CONTRACT → WORKFLOWS → SECURITY → TESTING → DEFINITION OF DONE
