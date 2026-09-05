# Health Checks

## Spring Boot Actuator
All backend services expose:
- `GET /actuator/health` — component health
- `GET /actuator/info` — build info
- `GET /actuator/metrics` — Micrometer metrics
- `GET /actuator/prometheus` — Prometheus scrape endpoint

## Docker Compose Health Checks
Every service defines `healthcheck` in docker-compose.yml.
Dependent services wait for health before starting (`depends_on: condition: service_healthy`).

## Fabric Health
`GET /api/v1/health/fabric` — peer status, block height per org.
Alert if any peer block height lags > 10 blocks from leader.

## Key Health Indicators
| Indicator | Alert Threshold |
|:---|:---|
| Fabric peer block lag | > 10 blocks |
| Kafka consumer lag | > 1000 messages |
| Redis memory usage | > 80% |
| PostgreSQL connection pool | > 90% utilized |
| AI service response time | > 5 seconds |
| Protected session error rate | > 5% |
