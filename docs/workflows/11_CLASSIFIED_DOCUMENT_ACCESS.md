# Classified Document Access Workflow

## Scenario
DRDO employee (clearance level 3) requests access to DRDO-DOC-007 (SECRET, requires level 3).

## Steps

1. **User browses Asset Hub**
   - Sees document listing (metadata only, no content)
   - Clicks "Request Access"

2. **Access request submitted**
   - `POST /api/v1/access/request`
   - Body: `{ resourceId: "DRDO-DOC-007", action: "READ", contextAttributes: {...} }`

3. **Access Service evaluates**
   - Extracts DID from JWT
   - Calls `AccessControlChaincode.evaluateAccess(did, "DRDO-DOC-007", "READ", context)`

4. **Chaincode evaluation**
   - Is DID ACTIVE? → YES
   - Does DID hold CLEARANCE_LEVEL_3 VC? → YES (calls IdentityContract.verifyVC)
   - ABAC match (department=DRDO, hour within allowed range)? → YES
   - Returns GRANTED

5. **Access logged on-chain**
   - `AccessControlChaincode.logAccess(...)` called
   - AccessLog written to ledger with txHash

6. **Protected session issued**
   - `ProtectedSessionService.issueSession(userDID, "DRDO-DOC-007", DOCUMENT, HIGH)`
   - Session stored in Redis + PostgreSQL
   - Session token (JWT) returned to user

7. **User opens protected viewer**
   - Frontend renders `<ProtectedDocumentViewer sessionToken={token} />`
   - Renderer requests first chunk

8. **Chunk delivery**
   - `GET /api/v1/protected-content/chunk?session={token}&chunk=0`
   - ProtectedContentService validates session
   - Fetches encrypted file from IPFS
   - Decrypts server-side
   - Returns chunk bytes

9. **Protected rendering**
   - Browser renders chunk via Canvas with HIGH profile protection
   - Watermark overlaid (session ID, user display, timestamp)
   - Camera-resistance techniques active

10. **User reads document**
    - Session expires after 20 minutes (HIGH profile)
    - All events logged
