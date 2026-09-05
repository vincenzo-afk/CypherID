# Exam Suspicious Activity

## Monitored Events (Browser-Observable)
| Event | Threshold | Response |
|:---|:---|:---|
| Tab hidden | 1 occurrence | Log + SUSPICIOUS_ACTIVITY state |
| Tab hidden | 3 occurrences in 5 min | CONTENT_OBSCURED + flag for review |
| Focus lost | 3 occurrences in 5 min | Log + increase profile |
| Print dialog | 1 occurrence | CONTENT_OBSCURED + security alert |
| Rapid question navigation | > 2 questions/second | Flag for review |

## Suspicious Activity Flag
When flagged:
1. SecurityEventService logs event with: sessionId, eventType, timestamp, questionIndex
2. Event written to blockchain as SecurityAlert
3. Exam supervisor notified via WebSocket
4. Candidate's session flagged for post-exam review

## Content Obscuration During Exam
When CONTENT_OBSCURED state triggered:
- Current question replaced with obscuration overlay
- Timer continues running
- Candidate must contact supervisor to resume

## Post-Exam Review
All suspicious activity events are included in the exam session audit report.
Report includes: timeline of events, questions viewed, durations, flag events.
