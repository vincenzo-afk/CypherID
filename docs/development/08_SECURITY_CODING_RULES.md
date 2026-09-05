# Security Coding Rules

## Input Validation
```java
// REQUIRED: validate all inputs
@NotNull @Pattern(regexp = "did:cypherid:0x[0-9a-f]+")
private String did;
```

## SQL
```java
// REQUIRED: parameterized queries only (JPA)
userRepository.findByDid(did); // safe
// FORBIDDEN: string concatenation in queries
em.createQuery("SELECT u FROM User u WHERE u.did = '" + did + "'"); // NEVER
```

## Logging
```java
// REQUIRED: no sensitive data in logs
log.info("Access request for DID: {}", maskDID(did)); // safe
// FORBIDDEN
log.info("Password: {}", password); // NEVER
log.info("JWT: {}", token); // NEVER
```

## Cryptography
```java
// REQUIRED: use standard library
SecureRandom random = new SecureRandom();
byte[] iv = new byte[12];
random.nextBytes(iv); // safe

// FORBIDDEN: predictable random for security
byte[] iv = new byte[12]; // zeros — NEVER
Math.random(); // for crypto — NEVER
```

## Authorization
```java
// REQUIRED: check authorization before any data access
@PreAuthorize("hasRole('ORG_ADMIN') or #did == authentication.principal.did")
public DIDDocument resolveDID(String did) { ... }

// FORBIDDEN: trust client-supplied authorization
public DIDDocument resolveDID(String did, boolean isAdmin) {
    if (isAdmin) return getAnyDID(did); // NEVER trust client
}
```
