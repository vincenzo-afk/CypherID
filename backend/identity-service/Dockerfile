# syntax=docker/dockerfile:1
# CypherID Identity Service (port 8081)
# Build context must be the repository root:
#   docker compose build identity-svc
FROM gradle:8.8-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :backend:identity-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/backend/identity-service/build/libs/app.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]