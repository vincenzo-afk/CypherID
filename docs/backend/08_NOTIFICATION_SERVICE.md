# Notification Service

## Package
`com.cypherid.notification`

## Port
8085

## Responsibilities
- Consume identity-events, asset-events, security-alerts from Kafka
- Deliver notifications to users (in-app only for demo)
- WebSocket push to user's notification inbox

## In-App Notifications
- VC issued
- Access request decision (granted/denied)
- Asset transferred to you
- Security alert (if user is affected)
- Session expiry warning

## Out of Scope (Demo)
- Email notifications
- SMS notifications
