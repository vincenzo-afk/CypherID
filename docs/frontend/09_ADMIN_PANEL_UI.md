# Admin Panel UI

## Sections
1. **User Management** — List users, view DID, issue VCs, suspend/revoke DID
2. **Policy Editor** — Create/edit ABAC policies per resource
3. **VC Template Builder** — Create credential schemas
4. **System Health** — Peer status, block height, transaction throughput
5. **Emergency Override** — Controlled emergency access grant (with reason input)
6. **Protection Configuration** — Set protection profiles per document/exam/video

## Policy Editor
Form fields: resourceId, requiredRole, ABAC attributes (key-value pairs), action.
Preview: shows what user types would be granted/denied.
Submit: writes policy to blockchain.

## System Health Dashboard
Live metrics (WebSocket):
- Peer status (green/red per peer)
- Channel block height (updates in real-time)
- Transaction rate (chart)
- Active protected sessions count
