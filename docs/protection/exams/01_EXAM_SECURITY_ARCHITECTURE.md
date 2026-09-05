# Exam Security Architecture

## Security Requirement
Exam content must be protected from unauthorized capture and distribution.
A leaked exam question set invalidates the exam for all candidates.

## Architecture

### Question Storage
- Questions stored encrypted in IPFS
- Question set metadata (not content) on blockchain
- Questions served one at a time per authorized session

### Session Model
- Candidate must authenticate via DID
- Session bound to: candidateDID, examId, questionIndex, timestamp
- Questions served sequentially; no random access
- Session logs every question viewed (timestamp, duration)

### Protection Profile
Exams always use at least HIGH protection profile.
EXTREME profile recommended for high-stakes exams.

### Question Authorization
Server verifies:
1. Candidate is registered for this exam
2. Exam window is open (current time within exam schedule)
3. Candidate has not exceeded allowed attempt count
4. Requested question index is within candidate's allowed range

### Answer Submission
Answers submitted via separate authenticated endpoint.
Questions NOT re-served with answer submission (candidate must have viewed question).

## Backend-Only Intelligence
Correct answers are NEVER sent to browser.
Answer evaluation is server-side only.
