# Research: Admin Moderation Page for Jobs

## R1. Reuse the company review pattern

- **Decision**: `JobReview` mirrors `CompanyReview` (SCRUM-72 after its review round): `active` guard on load, approve with CONFLICT → "Mục này đã được xử lý" reload, reject through `RejectDialog` whose `onSubmit` throws a readable Error, Vietnamese not-found text.

## R2. Rounds and notes

- **Decision**: `buildProcessView(job.rounds.map((r) => ({ ...r, description: null })), job.notes)` into `HiringProcessTimeline` and `CompanyNotes` (SCRUM-81 D1). `CompanyNotes` already hides itself when there are no notes (E3).

## R3. Test data

- **Decision**: the seeded pending job ("Thực tập sinh Product Designer") has no rounds or notes, so the spec submits its own job "E2E moderation <id>" as `recruiter.fpt@launchly.test` through `POST /recruiter/jobs` with two rounds and two notes. `resetModeration()` deletes jobs whose title starts with "E2E moderation" before and after the spec.

## R4. Coverage

- Same as SCRUM-72: no web unit runner, e2e only (recorded).
