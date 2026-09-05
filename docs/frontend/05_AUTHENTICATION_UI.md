# Authentication UI

## Login Page
- DID input field
- Password input field
- "Login" button
- Link to register

## Register Page (KYC Form)
- Name, organization, department, employee ID
- Government ID (input, not displayed after submission)
- Public key upload or generate option
- Submit → pending KYC approval

## Post-Login
Redirect to `/wallet` (Identity Wallet) after successful login.

## Session Expiry
When access JWT expires: non-blocking toast notification "Session expiring in 2 minutes".
On expiry: redirect to login with "Session expired" message.
Protected content sessions: see `docs/frontend/12_PROTECTED_DOCUMENT_UI.md`.
