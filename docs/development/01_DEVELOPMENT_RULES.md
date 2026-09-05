# Development Rules

## Code Style
- Java: Google Java Style Guide
- JavaScript/TypeScript: Prettier defaults
- Python: PEP 8 + Black formatter

## Git
- Branch naming: `feature/{issue-id}-{short-description}`
- Commit messages: `type(scope): description`
- No direct push to main
- PR required for all changes

## Security Rules (Summary)
Full rules in `08_SECURITY_CODING_RULES.md`.
- No secrets in code
- No custom crypto
- No SQL string concatenation
- No content in browser (only via protected session)

## Java 21 Features
Encouraged:
- Record classes for DTOs
- Pattern matching for type checks
- Sealed classes for state enums
- Virtual threads for Fabric Gateway calls

Avoid:
- Raw types
- Unchecked casts
- Mutable shared state

## Dependency Management
- Pin all dependency versions
- Review new dependencies for security issues before adding
- Run OWASP Dependency Check on every build
