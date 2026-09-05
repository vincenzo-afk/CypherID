# Definition of Done

A task is DONE when ALL of the following are true:

## Code
- [ ] Feature implemented according to documented specification
- [ ] No compiler warnings or lint errors
- [ ] No secrets in code
- [ ] No hardcoded URLs, passwords, or keys

## Tests
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (where applicable)
- [ ] Security tests passing (no auth bypass, no injection)
- [ ] Coverage target met for modified code

## Security
- [ ] Authorization enforced on all new endpoints
- [ ] Session expiry enforced for protected content
- [ ] No sensitive data in API responses beyond what spec defines
- [ ] No false security claims in code comments or documentation

## Documentation
- [ ] Relevant docs/api/ file updated if API changed
- [ ] Relevant docs/data/ file updated if data model changed
- [ ] Security limitations documented if new limitation introduced
- [ ] AGENTS.md and implementation order updated if architecture changed

## Blockchain (if chaincode modified)
- [ ] MockStub unit tests passing
- [ ] No nondeterministic operations added
- [ ] Replay protection nonce handling correct
- [ ] Endorsement policy compatible

## Protection Layer (if renderer modified)
- [ ] Flicker safety limits enforced
- [ ] Fallback behavior implemented
- [ ] Human readability maintained (manual visual check)
- [ ] No false capture detection claims added
