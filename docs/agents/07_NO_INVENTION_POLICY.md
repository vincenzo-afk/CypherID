# No-Invention Policy

## What "No Invention" Means

An agent MUST NOT invent:

### APIs
Do not create REST endpoints that are not documented in `docs/api/`.
If a new endpoint is needed, add it to the API documentation first, then implement.

### Browser Capabilities
Do not write code that assumes a browser can detect OS-level screen recording.
Do not write code that claims to detect physical camera capture.
Check `docs/protection/capture/02_BROWSER_OBSERVABLE_EVENTS.md` for what is actually observable.

### Cryptographic Primitives
Do not implement your own AES, RSA, ECDSA, or any other cryptographic algorithm.
Use Java standard library (`java.security`, `javax.crypto`) or Bouncy Castle only.

### Blockchain Behaviors
Do not assume chaincode features beyond what is documented in the chaincode specs.
Chaincode is deterministic — do not add `Math.random()`, `System.currentTimeMillis()`, or HTTP calls.

### Benchmark Results
Do not add camera resistance effectiveness percentages to documentation unless they come from actual Camera Resistance Lab measurements with documented methodology.

## What To Do Instead
If something is needed that is not documented:
1. Add it to the relevant documentation file
2. Get it reviewed
3. Then implement it
