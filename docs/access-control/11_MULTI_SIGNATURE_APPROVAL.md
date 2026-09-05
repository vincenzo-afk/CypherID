# Multi-Signature Approval

## Purpose
Classified documents above a threshold classification level require multiple admin approvals before access is granted.

## Default Threshold
- SECRET and above: 2-of-3 org admins must approve

## Flow
```
User requests access to TOP_SECRET resource
    ↓
AccessControlChaincode.createMultiSigRequest(requestId, resourceId, requesterDID, requiredApprovers)
    ↓
Notification sent to required approvers
    ↓
Admin 1: approveMultiSig(requestId, approverDID, signature)
Admin 2: approveMultiSig(requestId, approverDID, signature)
    ↓
Threshold reached → MultiSigRequest.status = APPROVED
    ↓
Access Service issues protected session
```

## Timeout
MultiSig requests expire after 24 hours if not approved.

## Audit
Every approval is written to the blockchain with approver DID, signature, and timestamp.
