# Exam APIs

## POST /api/v1/exams/{examId}/session
Start an exam session (candidate must be pre-registered).

**Response 201:**
```json
{
  "sessionToken": "eyJ...",
  "examId": "...",
  "totalQuestions": 50,
  "durationMinutes": 120,
  "expiresAt": "ISO-8601"
}
```

---

## GET /api/v1/exams/question
Get a question pointer for an issued exam session. Caller is authenticated via
gateway JWT (`X-User-DID`); `sessionId` binds the question to the session.

**Query:** `?sessionId={id}&questionIndex={n}`

**Response 200:**
```json
{ "examId": "...", "sessionId": "...", "questionIndex": 5, "chunk": 5 }
```

Fetch the body via `GET /api/v1/protected-content/chunk?chunk={n}` with
`Authorization: Bearer {sessionToken}`. 404 `SESSION_NOT_FOUND` for unknown sessions.

---

## POST /api/v1/exams/answer
Submit answer for current question.

**Request:**
```json
{
  "sessionId": "...",
  "questionIndex": 5,
  "answer": "B"
}
```

**Response 200:** `{ "received": true, "questionIndex": 5 }`

Non-integer `questionIndex` is 400. Correct answer NOT returned.
Evaluation is server-side after exam ends.

---

## POST /api/v1/exams/{examId}/session/end
End exam session (or auto-expired by TTL). Closes the protected session.

**Response 200:** `{ "submitted": true, "examId": "...", "answeredCount": 5, "receiptId": "exam-receipt-..." }`

`receiptId` is a local submission receipt — not a blockchain transaction hash.
On-chain evidence is the access/session audit trail.

---

## GET /api/v1/exams/{examId}/session/audit (admin only)
Get full audit log for an exam session.
