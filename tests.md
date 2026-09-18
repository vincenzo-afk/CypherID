You are the lead QA engineer, security tester, integration tester, and DevOps validation engineer for the CypherID project.



Your job is NOT merely to run existing tests.



Your job is to determine whether the CypherID repository actually works as a complete system and whether its implementation matches its documentation and stated security guarantees.



Treat the repository source code as the implementation source of truth and the documentation as the specification to validate against.



DO NOT assume that something works because:



a test exists,

a method exists,

an endpoint exists,

Docker starts,

compilation succeeds,

documentation says it works,

or a mock test passes.



You must actually execute the system wherever possible.



Do not silently modify tests just to make them pass.
Do not weaken assertions.
Do not mark a feature PASS because it is only mocked.
If infrastructure is unavailable, mark the test BLOCKED and explain exactly why.

================================================== PHASE 0 — REPOSITORY AUDIT

Before running anything, inspect the entire repository.



Identify:



Frontend

API Gateway

Identity Service

Access Service

Asset Service

Audit Service

Hyperledger Fabric

Chaincode

PostgreSQL

Redis

Kafka

ZooKeeper

IPFS

Docker configuration

Infrastructure scripts

Existing automated tests

Documentation/testing specifications

Demo scripts



Build a dependency map showing:



Frontend
-> Gateway
-> backend services
-> PostgreSQL / Redis / Kafka / IPFS / Fabric



Also identify:



ports

environment variables

secrets

database dependencies

Kafka topics

Fabric channels

chaincodes

service-to-service communication

authentication mechanisms

authorization mechanisms.



Compare documentation against actual source code.



Create a list:



DOCUMENTED BUT NOT IMPLEMENTED
IMPLEMENTED BUT NOT DOCUMENTED
DOCUMENTATION/IMPLEMENTATION MISMATCH
BROKEN/INCOMPLETE CONFIGURATION
POTENTIAL SECURITY ISSUE



Pay particular attention to startup scripts, Docker Compose profiles, environment variables, service ports, Fabric configuration, and health checks.

================================================== PHASE 1 — BUILD VALIDATION

Run every appropriate build.



Backend:



Gradle build

compile all services

run all unit tests



Blockchain:



compile all chaincodes

run all chaincode tests



Frontend:



npm install/npm ci as appropriate

npm build

lint if configured

existing frontend tests if present



Do not stop after the first failure.



Record:



exact command

exit code

failure

root cause

affected component

whether the failure is environmental or a real project defect.



Verify that generated artifacts are actually usable.

================================================== PHASE 2 — EXISTING AUTOMATED TESTS

Find and execute ALL existing tests.



At minimum inspect and run:



blockchain/chaincode/identity/.../IdentityContractTest.java



blockchain/chaincode/access-control/.../AccessControlContractTest.java



blockchain/chaincode/asset-registry/.../AssetContractTest.java



backend/asset-service/.../SessionStateMachineTest.java



backend/asset-service/.../ProtectedSessionServiceTest.java



backend/asset-service/.../ProtectedContentServiceTest.java



backend/asset-service/.../EncryptionServiceTest.java



backend/asset-service/.../AssetServiceTest.java



backend/asset-service/.../WatermarkServiceTest.java



backend/access-service/.../PolicyEngineServiceTest.java



Also inspect every test directory and do not assume the above list is exhaustive.



For each test suite determine:



what it actually tests

what it mocks

what it does NOT test

whether assertions are meaningful

whether edge cases are missing

whether the test could pass while production functionality is broken.

================================================== PHASE 3 — DOCKER / INFRASTRUCTURE VALIDATION

Start the complete infrastructure.



Verify:



PostgreSQL
Redis
Kafka
ZooKeeper
IPFS
Fabric CA
Fabric orderer
Fabric peers
CouchDB
all backend services
API Gateway
frontend



Check:



containers start

containers remain healthy

health endpoints respond

logs contain no fatal errors

dependencies connect successfully

services don't repeatedly restart

ports are correctly mapped

environment variables are correctly injected.



Test clean startup from zero.



Then test:



docker compose down
docker compose up



Also test a fresh environment with no existing volumes if safe.



Check whether the documented startup procedure actually works.



Verify every script referenced by documentation actually exists.



Verify every path referenced in documentation actually exists.



Do not assume infrastructure works merely because containers show "Up".

================================================== PHASE 4 — DATABASE TESTING

Test PostgreSQL.



Verify:



database starts

migrations/schema initialization works

tables are created

services can connect

inserts work

reads work

updates work

transactions behave correctly

constraints work

invalid data is rejected

duplicate identities are handled

duplicate asset IDs are handled

concurrent writes don't corrupt state.



Test restart persistence.



Stop/restart PostgreSQL and verify persistent data survives when persistence is expected.



Test behavior when PostgreSQL is unavailable.



Expected behavior must be:



no silent corruption

useful error response

no leaked credentials/secrets

service recovery after database returns.

================================================== PHASE 5 — REDIS TESTING

Verify:



connection

caching

TTL behavior

rate limiting if Redis-backed

session state if Redis-backed

expiration

restart behavior

failure handling.



Test:



Redis unavailable

Redis restart

expired values

concurrent access.

================================================== PHASE 6 — KAFKA TESTING

Verify:



Kafka starts

producers connect

consumers connect

topics are created

messages are published

messages are consumed

audit events reach Audit Service

consumer restart behavior

duplicate messages

delayed messages

Kafka unavailable

Kafka restart.



Verify that an important audit event is not silently lost.



Determine whether audit behavior is:



synchronous

asynchronous

eventually consistent.



Document this explicitly.

================================================== PHASE 7 — IPFS TESTING

Test actual asset storage.



Upload a file.



Verify:



encrypted data is produced

IPFS receives the encrypted blob

CID is returned

CID is stored correctly

file can be retrieved

decrypted result equals original file.



Test:



empty file

small file

binary file

large file

maximum allowed file

unsupported file

corrupted file

IPFS unavailable

IPFS restart.



Verify the raw IPFS content is NOT plaintext.

================================================== PHASE 8 — CRYPTOGRAPHY TESTING

Test AES-256-GCM implementation.



Verify:



Encrypt plaintext.

Decrypt ciphertext.

Confirm exact plaintext equality.



Test:



empty plaintext

binary data

Unicode

large data

repeated encryption

nonce/IV uniqueness

authentication tag validation

wrong key

modified ciphertext

modified authentication tag

modified IV

truncated ciphertext.



Every tampering case must fail securely.



Verify that encryption keys are not logged.



Verify that plaintext files are not accidentally stored where they should not be.



Inspect:



logs

PostgreSQL

IPFS

HTTP responses

temporary files.

================================================== PHASE 9 — IDENTITY TESTING

Test complete identity lifecycle.



Create identity/DID.



Verify:



DID format

DID uniqueness

key generation

public/private key handling

DID persistence

blockchain registration

PostgreSQL metadata

DID resolution.



Test:



CREATE
READ
UPDATE
SUSPEND
UNSUSPEND if supported
REVOKE
VERIFY



Test invalid DID.



Test duplicate DID.



Test unauthorized modification.



Test revoked identity access.



Test suspended identity access.



Test malformed credentials.



Test credential issuance.



Test credential verification.



Test credential revocation.



Test expired credentials if expiration exists.



IMPORTANT:



Determine whether authentication is actually:



passwordless SSI

cryptographic challenge-response

wallet signature based

or DID + password + JWT.



Do not accept marketing terminology as proof.



Document the actual authentication model.

================================================== PHASE 10 — AUTHENTICATION TESTING

Test:



valid login

invalid password

invalid DID

nonexistent user

suspended user

revoked user

empty credentials

malformed credentials

SQL injection attempts

excessively long credentials

repeated failed login attempts.



JWT testing:



valid access token

expired access token

malformed token

modified token

wrong signing secret

refresh token

expired refresh token

revoked/suspended user with otherwise valid token.



Verify:



401 vs 403 behavior

token expiration

refresh behavior

token claims

sensitive information is not exposed.



Attempt replay of tokens where appropriate.

================================================== PHASE 11 — API GATEWAY TESTING

Test every gateway route.



Verify:



routing

authentication

CORS

rate limiting

error handling

timeout handling

malformed requests

oversized requests

unknown routes

service unavailable.



Ensure backend services cannot accidentally bypass required gateway security if the architecture expects gateway enforcement.



Test direct backend access separately.

================================================== PHASE 12 — ACCESS CONTROL TESTING

This is one of the most important test areas.



Test RBAC.



Test ABAC.



Test policy evaluation.



Test:



ALLOW
DENY
missing policy
conflicting policies
invalid policy
expired policy
time-bound policy
delegated access
revoked delegation
multi-signature request
insufficient signatures
duplicate approval
unauthorized approval
emergency override.



Create multiple users with different attributes.



For example:



User A:
organization = DRDO
department = R&D
clearance = SECRET



User B:
organization = BEL
department = Avionics
clearance = lower



Resource:
classification = SECRET



Verify that only authorized users can access it.



Test attribute changes after policy creation.



Test access after user suspension.



Test access after identity revocation.



Test access after policy deletion/update.



Test ownership changes.



Test privilege escalation attempts.



Try manipulating:



user DID

organization

department

clearance

asset ID

policy ID

request ID

JWT claims.



Never trust client-supplied authorization attributes.

================================================== PHASE 13 — ACCESS REQUEST / DECISION TESTING

For every access request verify:



request created
→ identity authenticated
→ policy loaded
→ policy evaluated
→ ALLOW/DENY
→ decision returned
→ audit event generated.



Verify denied requests cannot retrieve protected content.



Verify authorized requests receive a valid protected session.



Test repeated requests.



Test concurrent requests.



Test requests after access expires.



Test requests against burned assets.



Test requests against transferred assets.

================================================== PHASE 14 — DIGITAL ASSET TESTING

Test complete asset lifecycle.



UPLOAD
LIST
READ METADATA
TRANSFER
HISTORY
BURN



Upload files with:



normal filename

spaces

Unicode filename

very long filename

duplicate filename

duplicate content

binary content

maximum size

over-limit size

empty content.



Verify ownership.



Verify metadata.



Verify blockchain registry.



Verify IPFS CID.



Verify encryption key handling.



Test transfer:



owner → valid recipient

unauthorized transfer

transfer to nonexistent user

transfer to revoked user

transfer after burn

repeated transfer

concurrent transfer.



Test burn:



burned asset cannot be accessed

history remains available where expected

database key material is handled correctly

IPFS cleanup occurs if intended

system does not claim physical destruction of every possible copy.

================================================== PHASE 15 — BLOCKCHAIN TESTING

Start a REAL Fabric network.



Do not rely only on mocked Fabric clients.



Verify:



CA

organizations

peers

orderer

channel

chaincodes

chaincode deployment

endorsement

transactions

commit status

queries.



Test all chaincodes.



Identity chaincode:



createDID

resolveDID

updateDID

suspendDID

revokeDID

credential operations.



Access chaincode:



createPolicy

evaluateAccess

logAccess

delegateAccess

revokeDelegate

multisig

approval

queries.



Asset chaincode:



mintAsset

transferAsset

burnAsset

queryAsset

owner query

history.



Test invalid transactions.



Test unauthorized transactions.



Test duplicate transactions.



Test concurrent transactions.



Test chaincode restart/redeployment where appropriate.



Verify transaction hashes.



Verify blockchain history is actually immutable/tamper-evident.

================================================== PHASE 16 — FABRIC FAILURE TESTING

Stop:



peer

orderer

CA

CouchDB



one at a time.



Observe application behavior.



Expected:



clear errors

no fake success

no corrupted PostgreSQL state

recoverability after Fabric returns.



Test a transaction where:



database update occurs

blockchain transaction fails.



Determine whether the system can become inconsistent.



Look specifically for distributed transaction consistency problems.

================================================== PHASE 17 — PROTECTED SESSION TESTING

Test:



session creation
session authorization
session JWT
session expiration
session close
invalid session
wrong user
wrong asset
wrong session ID
expired session
burned asset
revoked user.



Verify a session cannot be reused after expiry.



Verify one user cannot access another user's session.



Verify session IDs are not predictable.



Verify protected session JWT cannot be modified.



Test replay.



Test concurrent sessions.



Test session termination.

================================================== PHASE 18 — PROTECTED CONTENT TESTING

Test:



LOW
MEDIUM
HIGH
EXTREME



Verify each protection profile actually changes behavior according to its specification.



Test:



document rendering

exam rendering

video rendering

watermark

temporal modulation

spatial protection

focus loss

visibility change

fullscreen change

beforeprint

freeze/resume

suspicious keyboard events.



Verify content remains human-readable under normal use.



Verify protection does not completely destroy legitimate usability.



Verify watermark contains expected identity/session information.



Verify watermark changes as expected.



Verify sensitive content is not exposed in ordinary DOM text if the architecture intends canvas-only rendering.



Check:



DOM

browser network requests

browser storage

source maps

console

downloaded resources.



IMPORTANT:



Do not claim that screenshot prevention works simply because keyboard detection works.



Test and document the actual security boundary.



Explicitly distinguish:



DETECTION
DETERRENCE
OBSCURING
PREVENTION



Do not claim OS-level screenshot prevention unless it is actually implemented and verified.

================================================== PHASE 19 — BROWSER SECURITY TESTING

Use a real browser where possible.



Test:



Chrome
Firefox
Edge
Safari if environment permits.



Test:



fullscreen

focus loss

tab switching

minimizing

printing

print preview

browser screenshot mechanisms

developer tools

page source

network inspection

cached resources

browser back button

refresh

multiple tabs

direct protected URL access.



Verify behavior after:



refresh

back

forward

duplicate tab

session expiration.

================================================== PHASE 20 — SCREENSHOT / CAMERA RESISTANCE CLAIM VALIDATION

Treat this as a security mitigation test, NOT proof of perfect capture prevention.



Verify:



watermark visibility

watermark movement

temporal modulation

spatial pattern

focus-loss behavior

print behavior.



If practical, test screenshots or screen captures through available browser/OS mechanisms.



Do not attempt to prove impossible claims.



Report:



What is actually prevented?
What is detected?
What is merely discouraged?
What remains possible?

================================================== PHASE 21 — WATERMARK TESTING

Verify:



identity is correct

display ID is correct

timestamp is present

position changes

watermark is visible

watermark does not disappear unexpectedly

different users produce different watermark identity

session information is correct.



Test long-running sessions.



Test rapid updates.



Test multiple simultaneous sessions.



Test malformed user data.

================================================== PHASE 22 — EXAM TESTING

Test:



start exam
get question
submit answer
submit invalid answer
submit answer twice
submit answer after expiry
switch tabs
lose focus
resume
end exam
audit event.



Test:



unauthorized exam access

expired exam session

wrong session ID

replayed submission

concurrent submissions

malformed answers.



Verify answer integrity.



Verify audit trail.

================================================== PHASE 23 — VIDEO TESTING

Test:



authorized video session

unauthorized session

expired session

chunk retrieval

invalid chunk

out-of-range chunk

excessive chunk requests

rate limiting

concurrent chunks

video session close.



Verify protected rendering and watermarking.



Test large video behavior where practical.

================================================== PHASE 24 — AUDIT TESTING

Verify audit events exist for important actions.



At minimum:



DID creation
credential issuance
credential revocation
asset creation
asset transfer
asset burn
access request
access denial
access grant
protected session creation
security event
session close
administrative actions.



Verify:



event timestamp

actor

action

resource

result

relevant metadata

correlation/request/session ID if available.



Test audit ordering.



Test asynchronous Kafka delays.



Test duplicate events.



Test missing events.



Test audit report generation.



Verify PDF output is valid and contains expected events.

================================================== PHASE 25 — SECURITY TESTING

Perform application security testing.



Test for:



SQL injection
NoSQL injection where applicable
command injection
path traversal
XXE where applicable
SSRF where applicable
XSS
CSRF
CORS misconfiguration
JWT manipulation
authentication bypass
authorization bypass
IDOR
privilege escalation
mass assignment
parameter pollution
file upload abuse
malicious filenames
oversized requests
rate-limit bypass
session fixation
session replay.



Test API parameters with:



null

empty string

huge strings

negative numbers

unexpected types

duplicate fields

malformed JSON.



Check whether errors leak:



stack traces

SQL

filesystem paths

credentials

JWT secrets

private keys

internal hostnames

Fabric credentials.

================================================== PHASE 26 — SECRET / CREDENTIAL TESTING

Search repository and runtime artifacts for:



passwords
API keys
private keys
JWT secrets
Fabric credentials
database credentials
Kafka credentials
IPFS credentials.



Check:



source code
.env files
logs
Docker environment
frontend bundle
browser network traffic
source maps.



Ensure secrets are not shipped to the frontend.



Verify production secrets are configurable.

================================================== PHASE 27 — FILE UPLOAD SECURITY

Attack the upload endpoint safely.



Test:



executable extensions

double extensions

path traversal filename

null bytes

huge filename

MIME mismatch

malformed content

compressed content

empty file

oversized file.



Verify uploaded content is encrypted before storage.



Verify filename cannot escape intended storage.



Verify content type cannot bypass authorization.

================================================== PHASE 28 — RATE LIMITING / ABUSE

Test:



login brute force
API requests
protected content chunks
access requests
asset uploads
session creation.



Determine whether rate limiting actually works.



Test:



within limit

exactly at limit

over limit

after reset

multiple IPs/users if relevant

malformed requests.



Verify HTTP status and retry behavior.

================================================== PHASE 29 — CONCURRENCY TESTING

Run concurrent requests for:



asset upload

asset transfer

asset burn

access request

policy update

multisig approval

session creation

content chunks.



Look for:



race conditions
duplicate records
double transfer
double burn
double approval
inconsistent ownership
lost audit events.

================================================== PHASE 30 — FAILURE / RECOVERY TESTING

Kill individual components while the system is running.



Test:



PostgreSQL down
Redis down
Kafka down
IPFS down
Fabric peer down
Fabric orderer down
backend service down
gateway down.



Verify:



useful error

no fake success

recovery

data consistency

audit consistency.



Restart services and verify recovery.

================================================== PHASE 31 — FRONTEND TESTING

Test every route.



Authentication pages:



login

registration



Application:



wallet

assets

access requests

admin

audit

notifications



Protected:



document

exam

video.



Test:



loading
success
empty state
error state
network failure
expired JWT
403
404
slow API
duplicate click
refresh
browser back
mobile viewport
desktop viewport.



Verify no protected page renders sensitive content before authorization.

================================================== PHASE 32 — ACCESSIBILITY

Test:



keyboard navigation
focus order
buttons
forms
ARIA
contrast
labels
error messages
screen-reader semantics where practical.



Run automated accessibility tooling if available.

================================================== PHASE 33 — PERFORMANCE

Measure:



API latency
asset upload latency
encryption overhead
IPFS upload time
Fabric transaction latency
access-policy evaluation
protected session creation
content chunk latency
frontend rendering performance.



Test realistic payloads.



Identify bottlenecks.

================================================== PHASE 34 — LOAD TESTING

Perform controlled load tests.



Test concurrent:



users
logins
access requests
asset uploads
content sessions
content chunks.



Measure:



throughput
p50 latency
p95 latency
p99 latency
error rate
CPU
memory
database connections
Kafka lag.



Do not destroy the environment.

================================================== PHASE 35 — DOCUMENTATION VALIDATION

Read all documentation under:



docs/testing/



especially:



00_TESTING_INDEX.md
01_TEST_STRATEGY.md
02_UNIT_TESTING.md
03_INTEGRATION_TESTING.md
04_API_TESTING.md
05_CHAINCODE_TESTING.md
06_BLOCKCHAIN_TESTING.md
07_DATABASE_TESTING.md
08_FRONTEND_TESTING.md
09_BROWSER_TESTING.md
10_SECURITY_TESTING.md
11_AUTHORIZATION_TESTING.md
12_SESSION_SECURITY_TESTING.md
13_PROTECTED_RENDERING_TESTING.md
14_CAPTURE_MONITORING_TESTING.md
15_WATERMARK_TESTING.md
16_EXAM_SECURITY_TESTING.md
17_VIDEO_SECURITY_TESTING.md
18_PERFORMANCE_TESTING.md
19_LOAD_TESTING.md
20_FAILURE_TESTING.md
21_ACCESSIBILITY_TESTING.md
22_BROWSER_COMPATIBILITY_TESTING.md
24_TEST_ACCEPTANCE_CRITERIA.md



Compare every stated requirement with actual behavior.

================================================== PHASE 36 — FULL DEMO TEST

Run the documented demo exactly as a real user would.



Follow:



health
→ Arjun identity
→ Priya identity
→ Priya access denied
→ Arjun access granted
→ protected session
→ security event
→ audit trail
→ PDF report
→ Fabric health.



Do not mock the demo.



Record screenshots/logs/results where practical.

================================================== PHASE 37 — END-TO-END GOLDEN PATH

Perform this complete workflow:



Register user.

Create DID.

Issue credential.

Verify credential.

Upload confidential asset.

Encrypt asset.

Store encrypted blob in IPFS.

Register asset in Fabric.

Create access policy.

Login.

Request access.

Evaluate policy.

Receive grant.

Create protected session.

Render protected content.

Generate watermark.

Trigger a supported security event.

Verify monitoring behavior.

Close session.

Verify Kafka event.

Verify PostgreSQL audit event.

Generate audit PDF.

Verify blockchain history.

Transfer asset.

Verify new owner.

Burn asset.

Verify access is denied after burn.



Then repeat the same workflow with an unauthorized user and verify every security boundary.

================================================== PHASE 38 — NEGATIVE END-TO-END TEST

Create an unauthorized user.



Attempt:



login
→ access secret asset
→ bypass policy
→ directly access IPFS
→ directly call asset service
→ forge JWT
→ reuse another session
→ modify session ID
→ access burned asset
→ access after revocation
→ access after expiry.



Every unauthorized operation must fail.

================================================== PHASE 39 — DATA CONSISTENCY AUDIT

For a sample asset compare:



PostgreSQL
Fabric
IPFS
Kafka
Audit database
Frontend metadata.



Verify:



asset ID matches
owner matches
CID matches
classification matches
policy matches
audit history matches
timestamps are reasonable
transaction hashes are consistent.



Look for split-brain state.

================================================== PHASE 40 — FINAL SECURITY CLAIM AUDIT

For every security claim in README/docs, classify it as:



VERIFIED
PARTIALLY VERIFIED
NOT VERIFIED
FALSE / MISLEADING
NOT IMPLEMENTED
BLOCKED BY ENVIRONMENT.



Pay special attention to claims involving:



self-sovereign identity
immutable audit
blockchain authorization
encryption
camera resistance
screenshot protection
watermarking
tamper resistance
zero trust
passwordless authentication
session security.



Do not exaggerate.

================================================== FINAL REPORT

Produce a comprehensive QA report:

CypherID QA Report

Executive Summary

Overall status:
PASS / CONDITIONAL PASS / FAIL



Confidence:
LOW / MEDIUM / HIGH

Build Status

Frontend
Backend
Chaincode
Docker

Infrastructure Status

PostgreSQL
Redis
Kafka
IPFS
Fabric
Backend services
Gateway
Frontend

Test Results

Total tests
Passed
Failed
Blocked
Skipped

Critical Failures

List every P0/P1 issue.



For each:



ID
Severity
Component
Reproduction
Expected
Actual
Root cause
Evidence
Suggested fix

Security Findings

Rank:



CRITICAL
HIGH
MEDIUM
LOW
INFO

Architecture Mismatches

Documented behavior vs actual behavior.

Missing Tests

List important behavior currently not covered.

Performance Findings

Latency
Throughput
Resource usage
Bottlenecks

Reliability Findings

Failure/recovery behavior.

Final Verdict

State clearly whether CypherID:



Builds

Starts

Has working infrastructure

Has working blockchain

Has working authentication

Has working authorization

Has working asset management

Has working encryption

Has working protected rendering

Has working audit

Has working end-to-end flow

Meets its documented security claims.



Do NOT say "works perfectly" unless the evidence genuinely supports it.



If something cannot be verified, say:



"NOT VERIFIED"



rather than assuming it works.



At the end provide:

Top 10 Fixes Before Demo/Production

Prioritize the most important fixes.

Commands Used

Provide every major test/build/start command executed.

Evidence

Include relevant logs, HTTP responses, test output, screenshots, and reproduction steps where available.



IMPORTANT:
If you discover a defect, investigate the root cause before reporting it.
Do not merely report symptoms.



If a fix is obvious and low-risk, you may implement it, but:



preserve existing behavior

do not weaken security

do not delete tests

add a regression test

rerun the relevant tests

clearly document every modification.



Do not make broad architectural changes without explaining them first.