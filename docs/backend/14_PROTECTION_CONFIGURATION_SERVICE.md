# Protection Configuration Service

## Part of
`asset-service` package (`com.cypherid.asset.config`)

## Responsibilities
- System-wide protection defaults (configurable via admin API)
- Profile parameter definitions (LOW/MEDIUM/HIGH/EXTREME)
- Feature flags (enable/disable specific techniques)

## Configuration Storage
PostgreSQL `protection_configuration` table + Redis cache (read-heavy).

## Configurable Parameters
- Default profile per classification level
- Session TTL per profile
- Flicker safety limits (hard limits enforced in code, not just config)
- Event threshold counts (how many tab hides before OBSCURED)
