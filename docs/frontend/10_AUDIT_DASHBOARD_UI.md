# Audit Dashboard UI

## Sections
1. **Live Event Stream** — Real-time WebSocket feed of all events
2. **Access Log Table** — Filterable/sortable: timestamp, user DID, resource, action, decision, tx hash
3. **Security Alerts** — AI anomaly alerts + browser security events
4. **Asset Provenance** — Search any asset, see full history
5. **Policy Change Log** — Who changed what policy and when
6. **Export** — PDF report generation

## Live Event Stream
WebSocket connection to `/ws/audit`.
Auto-scrolling log with color coding: green=granted, red=denied, amber=security event.

## PDF Export
Date range picker + filter options.
Generate button → PDF download with embedded tx hashes.
PDF includes digital signature (iText).
