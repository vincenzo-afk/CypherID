# Chaincode Testing

## Framework
Fabric MockStub — simulates Fabric ledger and context for unit testing.

## Test Cases: IdentityChaincode

### TC-ID-01: createDID — success
- Input: valid DID, publicKey, metadata, nonce, timestamp
- Expected: DID document written to state, DIDCreated event emitted

### TC-ID-02: createDID — duplicate
- Input: DID that already exists in state
- Expected: ChaincodeException thrown

### TC-ID-03: resolveDID — found
- Pre-state: DID exists
- Expected: DID document returned as JSON

### TC-ID-04: resolveDID — not found
- Pre-state: empty ledger
- Expected: ChaincodeException thrown

### TC-ID-05: suspendDID — authorized
- Pre-state: DID ACTIVE, admin DID authorized
- Expected: DID status = SUSPENDED

### TC-ID-06: suspendDID — unauthorized
- Pre-state: caller is not admin
- Expected: ChaincodeException thrown

### TC-ID-07: issueVC — authorized issuer
- Pre-state: issuer DID active and authorized
- Expected: VC hash written to state

### TC-ID-08: verifyVC — revoked
- Pre-state: VC exists but revoked
- Expected: valid=false, reason=REVOKED

## Test Cases: AccessControlChaincode

### TC-AC-01: evaluateAccess — granted
- Pre-state: policy exists, DID active, VC valid, ABAC match
- Expected: GRANTED decision

### TC-AC-02: evaluateAccess — denied (no VC)
- Pre-state: policy exists, DID active, no matching VC
- Expected: DENIED + reason ACCESS_DENIED_INSUFFICIENT_ROLE

### TC-AC-03: evaluateAccess — denied (suspended DID)
- Pre-state: DID status SUSPENDED
- Expected: DENIED + reason ACCESS_DENIED_DID_INACTIVE

### TC-AC-04: logAccess — written
- Expected: AccessLog record in state with correct fields
