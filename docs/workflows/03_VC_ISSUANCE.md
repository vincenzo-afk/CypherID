# VC Issuance Workflow

1. Admin navigates to User Management → select user → Issue Credential
2. Select credential type and attributes
3. Submit → Identity Service validates issuer authority
4. IdentityChaincode.issueVC called
5. VC stored on-chain (hash), full VC delivered to user
6. VCIssued event emitted → Kafka → Notification → user notified
