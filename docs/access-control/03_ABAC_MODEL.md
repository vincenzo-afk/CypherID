# ABAC Model

## Attribute Categories

### Subject Attributes (from DID + VC)
- `department`: DRDO, BEL, MoD, etc.
- `location`: HYD, DEL, MUM, etc.
- `clearanceLevel`: 1–5
- `employmentStatus`: ACTIVE, CONTRACTOR

### Resource Attributes (from Policy)
- `classification`: UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET
- `ownerOrg`: Organization that owns the resource
- `accessibleLocations`: comma-separated location codes

### Environment Attributes (from request context)
- `currentTime`: hour of day (0–23)
- `ipAddress`: client IP
- `deviceId`: registered device identifier

## Policy Example
```json
{
  "resourceId": "DRDO-DOC-007",
  "requiredRole": "CLEARANCE_LEVEL_3",
  "abacAttributes": {
    "department": "DRDO",
    "accessibleLocations": "HYD,DEL",
    "allowedHours": "06-22"
  }
}
```

## Evaluation Logic
All specified ABAC attributes must match. Missing attributes in request context → DENIED.
