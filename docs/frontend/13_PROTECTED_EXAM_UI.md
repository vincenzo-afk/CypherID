# Protected Exam UI

## Component
`<ProtectedExamViewer sessionToken={token} examId={id} />`

## Layout
- Fullscreen enforced (requestFullscreen on start)
- Header: exam title, candidate ID, time remaining, question progress
- Question area: ProtectedRenderer canvas (question text)
- Answer area: standard form inputs (NOT protected renderer — user must type)
- Navigation: Next / Previous / Submit

## Question Delivery
Questions served one at a time. Previous questions not re-served.
Content chunk per question served via `/api/protected-content/chunk?session={token}&chunk={questionIndex}`

## Fullscreen Policy
Fullscreen exit triggers SUSPICIOUS_ACTIVITY state.
Second fullscreen exit triggers CONTENT_OBSCURED.
Candidate must contact supervisor to resume.

## Answer Submission
Answers submitted via `POST /api/exam/submit-answer` (separate from content delivery)
Answers validated server-side after exam window closes.

## Timer
Countdown timer on frontend is informational. Authoritative timer is server-side.
Session token expires at exam end time (server-enforced).
