# Data Minimization

## Principles
Collect only what is needed. Store only what is required for security and compliance.

## What Is NOT Stored
- Plaintext passwords (bcrypt hashed only)
- Private keys (user responsibility; optional Shamir escrow)
- Document content in PostgreSQL (IPFS + encrypted)
- Full user personal data beyond DID + org + department
- IP addresses in long-term logs (pseudonymized after 30 days)

## Watermark Privacy
Watermarks contain: truncated session ID, truncated user identifier (not full DID), document ID, timestamp.
Full DID is NOT embedded in watermark display text.
Mapping from watermark → full session → full user: requires access to PostgreSQL sessions table (admin only).

## Security Event Logging
Events logged: event type, session ID, timestamp, severity.
Not logged: document content, decryption keys, full request payloads.

## Session Security Logging
Behavioral signals logged: event type, time, frequency, resource type.
Not logged: document titles, full URLs with content identifiers.
