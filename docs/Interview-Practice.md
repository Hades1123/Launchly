# Interview practice

Text-only, job-linked interview practice for candidates (C-07 Interview Demonstration). This page describes the data model (SCRUM-63). The API (SCRUM-64) and the expiry cleanup (SCRUM-66) extend it.

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
