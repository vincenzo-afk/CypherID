# Event Model

Chaincode emits events via `stub.setEvent(name, payload)`.
Backend subscribes via Fabric Gateway event listener.
Events trigger Kafka publish and WebSocket push.
See `docs/events/02_BLOCKCHAIN_EVENTS.md`.
