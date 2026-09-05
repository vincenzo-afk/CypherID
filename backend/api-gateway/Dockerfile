# syntax=docker/dockerfile:1
# CypherID API Gateway (port 8080)
# Build context must be the repository root:
#   docker compose build api-gateway
FROM gradle:8.8-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :backend:api-gateway:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/backend/api-gateway/build/libs/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]