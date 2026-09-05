-- CypherID — per-service databases (docs/data/02_POSTGRESQL_MODEL.md)
-- Runs on first Postgres container init (docker-entrypoint-initdb.d).
-- The identity service uses POSTGRES_DB (cypherid); access/asset/audit get
-- their own databases so each service owns its Flyway migration history.
CREATE DATABASE cypherid_access;
CREATE DATABASE cypherid_asset;
CREATE DATABASE cypherid_audit;