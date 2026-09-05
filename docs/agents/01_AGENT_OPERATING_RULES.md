# Agent Operating Rules

## Mandatory Pre-Work
Before writing any code:
1. Read `docs/AGENTS.md`
2. Read the target subsystem's `00_*_INDEX.md`
3. Read the subsystem's architecture document
4. Read the subsystem's security document
5. Read the relevant workflow documents
6. Read the API contract if modifying an endpoint

## Mandatory Post-Work
After writing code:
1. Update relevant documentation if behavior changed
2. Add or update unit tests
3. Verify security tests still pass
4. Run linter / formatter

## When Uncertain
1. Read more documentation first
2. Check existing implementation for patterns
3. Make the smallest safe change
4. Leave a TODO comment rather than inventing behavior

## Code Ownership
Do not modify code in another service's package without reading that service's documentation.
