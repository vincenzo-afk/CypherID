# syntax=docker/dockerfile:1
# CypherID Access Service (port 8082)
# Build context must be the repository root:
#   docker compose build access-svc
FROM gradle:8.8-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle :backend:access-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/backend/access-service/build/libs/app.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]