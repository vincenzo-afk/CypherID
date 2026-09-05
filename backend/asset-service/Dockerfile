# syntax=docker/dockerfile:1
# CypherID Asset Service (port 8083)
# Build context must be the repository root:
#   docker compose build asset-svc
FROM gradle:8.8-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :backend:asset-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/backend/asset-service/build/libs/app.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]