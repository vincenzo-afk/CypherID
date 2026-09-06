# Assumptions

1. Deployment environment is a Linux-based host with Docker and Docker Compose installed.
2. The demo environment has sufficient RAM (minimum 16 GB recommended for full Fabric network).
3. All organizations (BEL, DRDO, MoD) are represented as separate Fabric organizations for demo purposes.
4. Users have modern browsers (Chrome 90+, Firefox 88+, Edge 90+) for protected content features.
5. IPFS node is local for demo; production would use a private IPFS cluster or alternative distributed storage.
7. Fabric CA provides the root of trust; external PKI integration is not assumed.
8. KYC verification in the demo is simulated (form-based); real KYC integration is out of scope.
9. The camera resistance techniques are experimental; effectiveness varies by device, display, and conditions.
10. Browser-observable capture events are limited to what the browser actually exposes via standard APIs.
11. The protected content system does not prevent a determined adversary with physical access to the display.
