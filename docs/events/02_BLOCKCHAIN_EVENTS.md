# Blockchain Events

## IdentityChaincode Events
| Event Name | Trigger | Payload |
|:---|:---|:---|
| DIDCreated | createDID | `{ did, txHash, timestamp }` |
| DIDSuspended | suspendDID | `{ did, reason, adminDID, txHash }` |
| DIDRevoked | revokeDID | `{ did, reason, adminDID, txHash }` |
| VCIssued | issueVC | `{ did, vcId, credentialType, txHash }` |
| VCRevoked | revokeVC | `{ did, vcId, txHash }` |

## AccessControlChaincode Events
| Event Name | Trigger | Payload |
|:---|:---|:---|
| AccessGranted | logAccess (GRANTED) | `{ did, resourceId, action, txHash }` |
| AccessDenied | logAccess (DENIED) | `{ did, resourceId, reason, txHash }` |
| PolicyCreated | createPolicy | `{ policyId, resourceId, txHash }` |
| MultiSigApproved | approveMultiSig (threshold met) | `{ requestId, resourceId, txHash }` |

## AssetChaincode Events
| Event Name | Trigger | Payload |
|:---|:---|:---|
| AssetMinted | mintAsset | `{ assetId, ownerDID, txHash }` |
| AssetTransferred | transferAsset | `{ assetId, fromDID, toDID, txHash }` |
| AssetBurned | burnAsset | `{ assetId, ownerDID, txHash }` |

## Event Consumption
Java backend subscribes to all events via Fabric Gateway event listener.
Events trigger: Kafka publish, WebSocket push, PostgreSQL log entry.
