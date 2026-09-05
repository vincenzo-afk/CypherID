# syntax=docker/dockerfile:1
# CypherID Audit Service (port 8084)
# Build context must be the repository root:
#   docker compose build audit-svc
FROM gradle:8.8-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :backend:audit-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/backend/audit-service/build/libs/app.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]