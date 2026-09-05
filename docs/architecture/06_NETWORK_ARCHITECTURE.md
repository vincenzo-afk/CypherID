# Network Architecture

## Docker Network
Single bridge network: `cypherid-net`

## Exposed Ports (Host)
| Port | Service |
|:---|:---|
| 8080 | API Gateway (primary entry point) |
| 3000 | Frontend (React dev server) |
| 5001 | IPFS API (admin only) |

## Internal Only
All other ports are internal to the Docker network.

## TLS
- API Gateway terminates TLS for external clients
- Inter-service communication within Docker network uses plaintext (acceptable for demo; TLS recommended for production)
- Fabric peers communicate via TLS using Fabric-generated certificates

## Fabric Channel
- Channel name: `cypherid-channel`
- All 3 organizations are members
- Single channel for demo; production would use multiple channels for data isolation
