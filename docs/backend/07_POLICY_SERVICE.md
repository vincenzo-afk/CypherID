# Policy Service

## Note
Policy management is part of Access Service (not a separate microservice for demo).
`PolicyEngineService` within access-service handles:
- Policy CRUD via chaincode
- Policy query and display
- Policy audit log

For production scale, this could be extracted to a dedicated service.
