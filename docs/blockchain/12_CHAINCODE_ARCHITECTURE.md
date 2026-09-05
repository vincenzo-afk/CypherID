# Chaincode Architecture

## Three Chaincodes

### 1. IdentityContract
- Package: `com.cypherid.identity`
- Main class: `IdentityChaincode`
- Functions: `createDID`, `resolveDID`, `updateDID`, `suspendDID`, `revokeDID`, `issueVC`, `revokeVC`, `verifyVC`

### 2. AccessControlContract
- Package: `com.cypherid.access`
- Main class: `AccessControlChaincode`
- Functions: `createPolicy`, `evaluateAccess`, `logAccess`, `delegateAccess`, `revokeDelegate`, `createMultiSigRequest`, `approveMultiSig`

### 3. AssetContract
- Package: `com.cypherid.asset`
- Main class: `AssetChaincode`
- Functions: `mintAsset`, `transferAsset`, `burnAsset`, `queryAsset`, `queryOwnerAssets`, `getAssetHistory`

## Chaincode Principles
- All state mutations use `SUBMIT` transactions (go through orderer)
- All reads use `EVALUATE` transactions (peer only, no ordering)
- No nondeterministic operations (no random, no current time from system — time passed as parameter)
- Replay protection: nonce stored in ledger per DID
- Chaincode-to-chaincode calls: AccessControlContract calls IdentityContract for DID verification

## Build
Each chaincode is a standalone Gradle project:
```
blockchain/chaincode/{name}/build.gradle
```

## Testing
MockStub-based unit tests in each chaincode module.
