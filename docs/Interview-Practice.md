# Interview practice

Text-only, job-linked interview practice for candidates (C-07 Interview Demonstration). This page describes the data model (SCRUM-63). The API (SCRUM-64), the expiry cleanup (SCRUM-66), question generation and answers (SCRUM-65) and feedback (SCRUM-67) extend it.

## Data model

`InterviewSession` is the candidate-owned practice session. It was application-bound; it now works with or without an application.

| Field                | Meaning                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `candidateId`        | Owner (`CandidateProfile`). Required. Every read and write is filtered by it.                             |
| `jobId`              | The practiced job. Required. Practice is allowed for any PUBLISHED job, before or after applying.         |
| `applicationId`      | Optional link to the candidate's application. `NULL` for practice without an application.                 |
| `scope`              | `FULL` (every interactive round of the job) or `ROUND` (one interactive round).                           |
| `status`             | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` (the existing `InterviewSessionStatus`).                        |
| `interviewConsentAt` | When the candidate accepted AI use for interview answers. Separate from the CV consent on the profile.   |
| `lastActivityAt`     | Last start, resume or saved answer.                                                                       |
| `expiresAt`          | Deadline for an incomplete session: `lastActivityAt` + 24 h. Indexed for cleanup. `NULL` means no expiry. |
| `summary`            | Overall feedback written when the session completes.                                                      |

Session-owned children (all `ON DELETE CASCADE` from the session):

- `InterviewPracticeRound`: a copy of one job stage (`name`, `position`, optional `stageId` that becomes `NULL` if the recruiter deletes the stage), its `status` and round `feedback`.
- `InterviewPracticeQuestion`: a generated question (`prompt`, `position`, `source` label such as `JOB_DESCRIPTION`).
- `InterviewPracticeAnswer`: the candidate's text answer with `feedback` and `score`; one per question.

### Separation from the question bank

Generated practice questions live only in `InterviewPracticeQuestion`. They are never written to `InterviewQuestion`, which stays the recruiter-authored bank. The old `InterviewAnswer` (answers to bank questions) is unchanged.

### Which rounds are interactive

A round is an interactive Q&A round when its stage `format` is `ONLINE` or `PHONE`. `ONSITE`, `ASSIGNMENT` and an unset format are informational only. The rule is `isInteractiveRoundFormat` in `@launchly/shared` (`constants/interview-practice.ts`), next to `PRACTICE_QUESTIONS_PER_ROUND = 5` and `PRACTICE_EXPIRY_HOURS = 24`.

## Migration and legacy rows

Migration `20261113120000_interview_practice_sessions` is forward-only:

1. Adds the new columns as nullable and makes `applicationId` nullable.
2. Backfills `candidateId` and `jobId` of every existing session from its application, then sets both `NOT NULL`.
3. Leaves `interviewConsentAt` and `expiresAt` `NULL` for legacy sessions, so they keep working and are never picked up by the 24-hour cleanup. They get `scope = FULL`.

Indexes: `(candidateId, createdAt)` for newest-first history, `jobId`, and `expiresAt` for cleanup.

## Retention

Completed sessions and their history are kept. Incomplete sessions expire 24 hours after the last activity and are deleted with their rounds, questions and answers (SCRUM-66).

## API (SCRUM-64)

All routes are candidate-only (`authenticate` + `authorize('CANDIDATE')`), live under `/candidates/me/interview-practice`, and use the shared Zod contracts in `packages/shared/src/schemas/interview-practice.ts`. Failures use the standard `apiErrorSchema` shape.

| Route      | Purpose                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `POST /`   | Start practice. Body `{ jobId, consent: true, stageId? }`. `201` new session, `200` an active one reused. |
| `GET /:id` | Resume the caller's own session with its saved rounds, questions and answers. Resets the 24 h clock.      |
| `GET /`    | History, newest first, `?page=1&limit=10` (limit at most 50). No questions or answer bodies.              |

### Start rules

- `consent` must be `true`. It is the interview AI consent and is separate from the CV consent; a missing or `false` value is a `400 VALIDATION_ERROR` and nothing is created.
- The job must be `PUBLISHED`, with or without an application. Otherwise `404`. If the candidate applied, the session stores `applicationId`; otherwise it is `NULL`.
- A job with a blank description, no stages, or no interactive round is blocked with `400`. There are never generic fallback questions.
- With `stageId`, only that round is practiced (`scope = ROUND`); it must belong to the job and be interactive (format `ONLINE` or `PHONE`), otherwise `400`. Without `stageId`, every interactive round is practiced in the job's order (`scope = FULL`); informational rounds are skipped.
- If the candidate already has an unexpired, incomplete session for the same job and scope (and round), it is returned instead of a duplicate.

### Ownership and expiry

- Every read filters by the caller's `candidateId`. Another candidate's session, or one that does not exist, is a `404`, so ids cannot be probed. Recruiters have no access.
- An incomplete session whose `expiresAt` has passed is a `404` on resume and is hidden from history, even before the cleanup deletes it. Completed sessions stay readable.
- Start and resume set `lastActivityAt = now` and `expiresAt = now + 24 h`.

## Expiry and cleanup (SCRUM-66)

### The inactivity clock

An incomplete session expires 24 hours after its last activity. Start and resume set `expiresAt = now + 24 h` (`practiceExpiry`); a saved answer and a question or feedback request do the same. Resume and history check the deadline themselves (`isPracticeExpired`), so an expired session is inaccessible immediately, before any row is deleted.

### The cleanup runner

`createPracticeCleanup` (in `interview-practice.cleanup.ts`) runs inside the API process, started from `server.ts`:

- **At startup:** one sweep, which catches up on every session that expired while the process was down.
- **Then every hour** while the process is healthy, so an expired session is deleted within one hour of its deadline.
- **Each sweep** deletes incomplete sessions with `expiresAt <= now` in batches of 100, ordered by `expiresAt` (indexed), and repeats until none are left. Rounds, questions and answers go with the session by cascade. The delete repeats the guard, so a session completed in the meantime, or already deleted by another API instance, is never touched and the sweep is safe to run concurrently or twice.
- **Never deleted:** completed sessions (history is kept) and legacy sessions whose `expiresAt` is `NULL`.
- **Logs** contain counts and the error type only, never questions or answers. A failed sweep is logged and the next hourly tick tries again.
- `PRACTICE_CLEANUP_ENABLED=false` turns the runner off (default `true`).

### Limitation

The one-hour guarantee holds only while the API process runs. If the process is down nothing is deleted; the sessions stay inaccessible to candidates but their rows remain until the next start sweeps them. There is no external scheduler.

## Questions and answers (SCRUM-65)

Both routes are candidate-only, owner-checked and interview-consent-checked on every call, and an expired or foreign session is a `404`. All text only: no voice, video, timer or score.

| Route                                    | Purpose                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /:id/rounds/:roundId/questions`    | Generate the five questions of one round. `201` when written, `200` when the stored set is returned.                                                     |
| `PUT /:id/questions/:questionId/answer`  | Save or replace one text answer. Body `{ answer }`, trimmed, 1 to 5000 characters. Returns the session. `409` once the round is completed.               |

### Generation

- The AI sees only the job title, description and requirements and the round name and format. Never the CV, profile or application.
- Exactly five questions per round (`PRACTICE_QUESTIONS_PER_ROUND`), each with a source label: `JOB_DESCRIPTION`, `JOB_REQUIREMENTS` or `ROUND_PROCESS`. The AI output is validated with `generatedPracticeQuestionsSchema` before anything is stored.
- Only an interactive round (stage format `ONLINE` or `PHONE`) can be generated. A job without a description, a round whose stage was deleted, an informational round and a session without interview consent are blocked with no AI call, and there is no generic fallback.
- A round that already has questions returns them with no AI call, so repeating or retrying never duplicates the set or touches saved answers. Questions are written under a lock on the round row; if two requests race, both may call the AI, but only the first stores a set and the other leaves it as it is.
- A provider failure, malformed output or a timeout (30 s, `AI_TIMEOUT_MS` in `providers/ai`) is a `503 AI_UNAVAILABLE`. Nothing is stored, so the same call can be repeated.
- Prompts and answers are never logged.

### Saving answers

Saving an answer creates or replaces it, starts a not-started round and moves the 24 h clock. Reloading the session (`GET /:id`) returns every saved answer.

### Shared AI limit

Question and feedback generation share one quota per signed-in candidate: **10 requests per 60 seconds**. The 11th returns `429 RATE_LIMITED` in the standard error shape; wait a minute and retry. The counter is in this API process's memory, so with more than one API instance each has its own quota. Use a shared store (for example Redis) before running several instances.

## Feedback and summary (SCRUM-67)

| Route                                  | Purpose                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POST /:id/rounds/:roundId/feedback`   | Advisory feedback for a round, and the overall summary when it was the last selected round. `201` when written, `200` when stored. |

Same rules as question generation: candidate-only, owner and interview-consent checked, expired or foreign session is a `404`, and the call draws from the shared **10 requests per 60 seconds** limit with the question route (the 11th is `429 RATE_LIMITED`).

### When feedback and the summary are written

- The round must have all five answers saved, otherwise `400 VALIDATION_ERROR` and no AI call.
- The AI sees the job title, the round name, and the five questions with their answers.
- The result is validated with `generatedRoundFeedbackSchema` before it is stored: an `overview`, `strengths`, `improvements` and one note per answer. The per-answer notes go to `InterviewPracticeAnswer.feedback`; the round body goes to `InterviewPracticeRound.feedback` as validated JSON text, and the round becomes `COMPLETED`.
- When every selected round is `COMPLETED`, a second AI call writes the overall summary (`overview`, `strengths`, `improvements`, `nextSteps`) into `InterviewSession.summary` as validated JSON text, and the session becomes `COMPLETED` with `completedAt`. Until then `summary` is `null`.
- Once a round is completed its answers are final (`PUT .../answer` returns `409`).

### Idempotency and failures

- Repeating the call returns what is stored and makes no AI call. If two requests race, only one completes the round (row lock); the other changes nothing.
- A provider failure, malformed output or a timeout is a `503 AI_UNAVAILABLE` and stores nothing for that step. If the round feedback was stored but the summary failed, the round stays completed and the next call writes only the summary.
- Prompts, answers and feedback are never logged.

### What the candidate receives

Every round `feedback` and the session `summary` carry the shared `PRACTICE_FEEDBACK_DISCLAIMER`: "AI-generated practice feedback is advisory and may be incorrect; it does not affect hiring decisions." There is no score, percentile, rank, pass/fail verdict or hiring recommendation anywhere: the answer `score` field was removed from the DTO and the `InterviewPracticeAnswer.score` column is dropped by the forward migration `20261114000000_drop_practice_answer_score` (the legacy `InterviewAnswer.score` is a different table and stays). Only the owning candidate can read results; there is no recruiter route.
