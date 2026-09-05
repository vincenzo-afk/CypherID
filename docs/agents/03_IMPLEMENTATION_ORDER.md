# Implementation Order

Follow this order. Do not skip phases. Each phase depends on the previous.

## Phase 0: Setup
- [ ] Read all docs listed in AGENTS.md mandatory reading
- [ ] Verify Docker environment
- [ ] Verify Java 21, Gradle, Python 3.11 available

## Phase 1: Infrastructure
- [ ] Docker Compose file with all services
- [ ] Environment config and secrets setup
- [ ] Health check verification for all containers

## Phase 2: Fabric Network
- [ ] crypto-config.yaml and configtx.yaml
- [ ] start-network.sh script
- [ ] Channel creation and peer joining
- [ ] Verify: `peer channel list` shows cypherid-channel

## Phase 3: Identity / DID / VC
- [ ] IdentityChaincode (Java) — all transactions
- [ ] IdentityChaincode unit tests (MockStub)
- [ ] Identity Service (Spring Boot) — DID CRUD, VC issuance
- [ ] Identity API endpoints
- [ ] Integration test: create DID → resolve DID

## Phase 4: RBAC + ABAC
- [ ] AccessControlChaincode (Java) — evaluateAccess, logAccess, createPolicy
- [ ] AccessControlChaincode unit tests
- [ ] Access Service (Spring Boot)
- [ ] Access API endpoints
- [ ] Integration test: policy creation → access evaluation → audit log

## Phase 5: Asset Management
- [ ] AssetChaincode (Java) — mint, transfer, burn
- [ ] AssetChaincode unit tests
- [ ] Asset Service (Spring Boot)
- [ ] IPFS integration (EncryptionService + IPFSService)
- [ ] Asset API endpoints
- [ ] Integration test: upload → mint → request access → grant → retrieve

## Phase 6: Backend APIs
- [ ] API Gateway configuration
- [ ] JWT auth (login, refresh, logout)
- [ ] Rate limiting
- [ ] All API endpoints documented in docs/api/ implemented

## Phase 7: Protected Session Infrastructure
- [ ] ProtectedSessionService
- [ ] ProtectedContentService
- [ ] WatermarkService
- [ ] SecurityEventService
- [ ] Protected Content APIs

## Phase 8: Protected Document Renderer
- [ ] ProtectedRenderer (Canvas-based, browser-side)
- [ ] TemporalEngine, SpatialEngine, PatternEngine
- [ ] WatermarkLayer
- [ ] Rendering safety limits enforced

## Phase 9: Watermarking
- [ ] SessionWatermark generation (WatermarkService)
- [ ] Watermark rendering in ProtectedRenderer
- [ ] Watermark forensic lookup API (admin)

## Phase 10: Capture Monitoring
- [ ] Browser event listeners (visibilitychange, blur, beforeprint, fullscreenchange)
- [ ] Security event reporting to backend
- [ ] State machine implementation

## Phase 11: Exam Protection
- [ ] Exam session management
- [ ] Question delivery (protected content chunks)
- [ ] Answer submission API
- [ ] Exam suspicious activity handling

## Phase 12: Video Protection
- [ ] Video playback session management
- [ ] Encrypted video chunk delivery
- [ ] Video watermarking

## Phase 13: Camera Resistance Lab
- [ ] Lab measurement harness
- [ ] Metrics collection (OCR accuracy, human readability)
- [ ] Test matrix execution
- [ ] Results documentation

## Phase 14: AI Anomaly Detection
- [ ] Kafka producer (Access Service)
- [ ] Python consumer + Isolation Forest inference
- [ ] Alert pipeline to Java backend
- [ ] On-chain SecurityAlert writing

## Phase 15: Frontend Integration
- [ ] All pages: Login, Wallet, AssetHub, AccessRequests, AdminPanel
- [ ] AuditDashboard with WebSocket
- [ ] ProtectedDocumentViewer, ProtectedExamViewer, ProtectedVideoViewer

## Phase 16: Security Testing
- [ ] All AT-xx tests passing
- [ ] Session security tests passing
- [ ] Authorization bypass tests passing

## Phase 17: Performance Testing
- [ ] Load test: 50 concurrent access requests
- [ ] Throughput test: blockchain tx/sec
- [ ] Rendering performance: 60fps at MEDIUM profile

## Phase 18: End-to-End Validation
- [ ] Full demo scenario: register → issue DID → upload asset → access request → grant → protect → audit

## Phase 19: Demo Preparation
- [ ] Demo data seeded
- [ ] Demo script validated
- [ ] Architecture poster
- [ ] Pitch deck
