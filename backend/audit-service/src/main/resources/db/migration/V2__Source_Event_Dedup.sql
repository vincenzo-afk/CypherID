-- Kafka delivery here is at-least-once (default consumer config, no producer
-- idempotence configured) — a rebalance or retry WILL redeliver a message.
-- Without a dedup key, AuditService.ingest() inserted a fresh row every time,
-- silently duplicating audit records. Producers now attach a UUID "eventId"
-- per published event; this column lets ingest() recognize a redelivery and
-- skip it instead of inserting a duplicate.
--
-- Nullable + a partial unique index: events from before this migration (or
-- from any producer that doesn't send eventId yet) keep working exactly as
-- before, just without dedup protection for those specific rows.
ALTER TABLE audit_events ADD COLUMN source_event_id VARCHAR(64);

CREATE UNIQUE INDEX idx_audit_events_source_event_id
    ON audit_events (source_event_id)
    WHERE source_event_id IS NOT NULL;
