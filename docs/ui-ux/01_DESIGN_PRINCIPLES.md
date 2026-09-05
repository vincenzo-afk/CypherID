# Design Principles

## Core Principles

### 1. Security Transparency
Users always know the security status of their session.
Protection profile, session expiry, and security events are visible.

### 2. Trust Indicators
Every blockchain transaction is surfaced to the user with its tx hash.
Users can verify their identity and access decisions on the ledger.

### 3. Minimal Surprise
Security events (tab hidden, session expiry) are communicated clearly.
Content obscuration is explained, not silent.

### 4. Accessibility First
Protection layer must not make content inaccessible to screen readers for non-classified UI elements.
Protected content rendering (canvas) is inherently not screen-reader accessible — this is a known limitation documented in `17_ACCESSIBILITY.md`.

### 5. Progressive Disclosure
Admin features only visible to admins.
Sensitive information revealed only to authorized users.
