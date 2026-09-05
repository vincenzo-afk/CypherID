# User Onboarding Workflow

## Steps

1. **User visits registration page**
   - Frontend: `/register`

2. **Submit KYC form**
   - Fields: name, organization, department, employee ID, government ID (hash only stored)
   - Frontend validates format; submits to `POST /api/v1/identity/did`

3. **Backend validates KYC**
   - Identity Service: verify required fields
   - Check organization is a registered Fabric org

4. **Fabric CA enrollment**
   - Identity Service: enroll with Fabric CA using org admin credentials
   - CA returns X.509 certificate for user

5. **DID generation**
   - Identity Service generates DID from user's public key: `did:cypherid:0x{hash}`
   - Calls `IdentityChaincode.createDID(did, publicKey, metadata, nonce, timestamp)`

6. **Blockchain transaction**
   - IdentityChaincode writes DID Document to ledger
   - Returns txHash

7. **User receives credentials**
   - DID displayed to user (must save)
   - Initial password set via secure link (email out of scope for demo)
   - Private key shown once (if generated server-side for demo)

8. **User can now log in**
   - `POST /api/v1/auth/login` with DID + password

## Security
- Government ID: hashed (SHA-256) before storage; raw ID not retained
- Password: bcrypt hashed
- Private key: user responsibility after initial display
