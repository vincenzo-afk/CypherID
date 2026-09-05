# Access Request UI

## Access Request Flow
1. Click "Request Access" on asset card
2. Confirmation dialog (shows: resource, action, current clearance, policy requirement)
3. Submit
4. Response: GRANTED (open protected viewer) or DENIED (show reason + tx hash)

## Access Request History
Table: timestamp, resource, action, decision, reason, tx hash.
Filter by: decision (GRANTED/DENIED), date range, resource.

## Pending Multi-Sig Requests
Separate section for requests awaiting multi-signature approval.
Shows: request ID, resource, requester, approvals received, approvals needed.
