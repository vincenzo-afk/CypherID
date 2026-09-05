# Non-Goals

## Explicitly Out of Scope

1. **Public blockchain** — CypherID uses permissioned Hyperledger Fabric only.
2. **Cryptocurrency or financial transactions** — No token economics, no payment rails.
3. **Hardware-based DRM** — No special glasses, no hardware security modules for content protection.
4. **Mathematical guarantee of camera capture prevention** — Software cannot make physical camera capture impossible. The system reduces readability, not eliminates it.
5. **OS-level screen recording prevention** — Browser JavaScript cannot universally prevent OS-level capture. The system applies every technically possible browser-side protection.
6. **Universal screenshot prevention** — Screenshots via OS are not preventable by web applications.
7. **Zero-Knowledge Proof production implementation** — ZKP is listed as an advanced/future feature, not a core deliverable.
8. **Mobile native application** — Web application only.
9. **External PKI integration** — Uses Fabric CA; external PKI integration is not in scope.
10. **Multi-cloud deployment** — Single Docker Compose deployment on one host.
11. **Biometric authentication** — KYC is web-form based, not biometric.
12. **Custom cryptographic algorithms** — Only standard, documented algorithms are used.
13. **Real-time video conferencing protection** — Protected video refers to recorded video playback, not live conferencing.

## Claims That Must Never Be Made

- "Content cannot be photographed."
- "Screen recording is prevented."
- "Screenshots are impossible."

## Correct Claims

- "Camera-resistant protected rendering designed to reduce the readability and usefulness of captured content while maintaining human readability."
- "Browser-observable capture events are monitored; OS-level capture cannot be detected."
