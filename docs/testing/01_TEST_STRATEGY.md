# Test Strategy

## Levels
1. Unit tests — isolated component testing
2. Integration tests — service + database + Fabric (test network)
3. API tests — REST endpoint testing
4. Security tests — authorization, injection, session security
5. Browser tests — UI, protected renderer, capture monitoring
6. Performance tests — load and throughput

## Framework Stack

| Layer | Framework |
|:---|:---|
| Java unit/integration | JUnit 5 + Mockito + Spring Boot Test |
| Chaincode unit | MockStub (Fabric) |
| API testing | REST Assured |
| Frontend unit | Jest + React Testing Library |
| Browser tests | Playwright |
| Load testing | Gatling |
| Security testing | OWASP ZAP (automated) + manual |

## Test Coverage Targets
| Layer | Line Coverage Target |
|:---|:---|
| Chaincode | ≥ 85% |
| Backend services | ≥ 80% |
| Frontend components | ≥ 70% |
| ProtectedRenderer | ≥ 75% |

## CI Policy
All tests must pass before merge. Security tests run on every PR.
