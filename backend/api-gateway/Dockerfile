# syntax=docker/dockerfile:1
# CypherID API Gateway (port 8080)
# Build context must be the repository root:
#   docker compose build api-gateway
FROM gradle:8.8-jdk21 AS build
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/root/.gradle gradle :backend:api-gateway:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/backend/api-gateway/build/libs/app.jar app.jar
EXPOSE 8080
# JDK caches DNS forever by default — on recreate, downstream service IPs go
# stale and the gateway dials dead addresses until restarted. 30s TTL keeps
# service discovery working across `up --force-recreate` cycles.
ENTRYPOINT ["java", "-Dnetworkaddress.cache.ttl=30", "-jar", "app.jar"]