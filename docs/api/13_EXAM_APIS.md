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
Get current question (served via ProtectedContentService).

**Headers:** `Authorization: Bearer {sessionToken}`

**Response:** Redirects to `/api/v1/protected-content/chunk?chunk={questionIndex}`

---

## POST /api/v1/exams/answer
Submit answer for current question.

**Request:**
```json
{
  "questionIndex": 5,
  "answer": "B"
}
```

**Response 200:** `{ "received": true, "questionIndex": 5 }`

Correct answer NOT returned. Evaluation is server-side after exam ends.

---

## POST /api/v1/exams/{examId}/session/end
End exam session (or auto-expired by TTL).

**Response 200:** `{ "submitted": true, "txHash": "..." }`

---

## GET /api/v1/exams/{examId}/session/audit (admin only)
Get full audit log for an exam session.
