# Routing

## Routes
| Path | Component | Auth Required | Role |
|:---|:---|:---|:---|
| `/login` | LoginPage | No | — |
| `/register` | RegisterPage | No | — |
| `/wallet` | IdentityWalletPage | Yes | Any |
| `/assets` | AssetHubPage | Yes | Any |
| `/access-requests` | AccessRequestsPage | Yes | Any |
| `/admin` | AdminPanelPage | Yes | ORG_ADMIN |
| `/audit` | AuditDashboardPage | Yes | SYSTEM_AUDITOR, ORG_ADMIN |
| `/notifications` | NotificationsPage | Yes | Any |
| `/protected/document/:sessionId` | ProtectedDocumentViewer | Yes | (session token) |
| `/protected/exam/:sessionId` | ProtectedExamViewer | Yes | (session token) |
| `/protected/video/:sessionId` | ProtectedVideoViewer | Yes | (session token) |

## Auth Guard
`<AuthGuard>` wrapper checks JWT validity before rendering protected routes.
Expired JWT: redirect to `/login`.
