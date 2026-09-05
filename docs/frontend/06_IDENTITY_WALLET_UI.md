# Identity Wallet UI

## Sections
1. **DID Card** — DID string, copy button, blockchain status (ACTIVE/SUSPENDED/REVOKED)
2. **Verifiable Credentials** — List of VCs with type, issuer, expiry, status
3. **Public Key** — Display and download
4. **Blockchain Evidence** — Link to DID document on audit interface

## DID Card
Shows: `did:cypherid:0x4a3b...` with copy-to-clipboard.
Status badge: 🟢 ACTIVE | 🟡 SUSPENDED | 🔴 REVOKED

## VC List
Each VC shows: type, issuer org, clearance level (if applicable), expiry, txHash.
Expired VCs shown with strikethrough.
