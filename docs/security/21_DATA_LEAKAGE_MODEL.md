# Data Leakage Model

## Leakage Vectors
| Vector | Mitigation |
|:---|:---|
| API response contains protected content | Content served via session only; never in API metadata |
| Log file contains sensitive data | Logging rules prohibit sensitive data |
| Error message reveals internal state | Generic error messages; details only in server logs |
| Browser cache stores protected content | Cache-Control: no-store |
| Browser developer tools access canvas | Canvas content not in DOM; some pixel capture possible |
| Network capture | TLS 1.3 |
| Database backup | PostgreSQL backup encryption |
| IPFS file access without auth | AES-256-GCM encryption |

## Residual Risk
Camera capture and OS-level screen recording represent residual leakage risk.
These are mitigated (not eliminated) by camera-resistant rendering and watermarking.
