# Research: Admin Approves or Rejects Jobs

## R1. Decision update

- **Decision**: `prisma.job.update({ where: { id, publicationStatus: 'PENDING' }, data, select })`; on P2025 read the job's status: missing → 404, else 409 "Job is already <status>".
- **Rationale**: the final SCRUM-71 pattern after review finding #3 (atomic, one round trip, email always follows a saved decision). SCRUM-80 D1 names `updateMany`; the intent (only while pending) is unchanged.

## R2. Reusing the recruiter job mapping

- **Decision**: export `jobSelect` (renamed `recruiterJobSelect`) and `toDto` (renamed `toRecruiterJobDto`) from `recruiter-job.service.ts`; the admin select spreads it and adds `reviewedAt`, `company: { select: { name } }`, `createdBy: { select: { email } }`.
- **Rationale**: SCRUM-79 D1 / SCRUM-80 D5; one mapping for rounds (with `roundFormatSchema` fallback), salary and notes.

## R3. Email

- **Decision**: add `job-published` and `job-rejected` kinds to `createModerationEmail` with `jobTitle` and `companyName`; reuse the line-break stripping for the subject.
- **Rationale**: same layout and safety rules as SCRUM-71 (review findings #7, #8).

## R4. Kept reason on resubmit

- **Decision**: drop `...(input.action === 'SUBMIT' && { moderationReason: null })` in `recruiter-job.service.ts` and its comment; approve clears the reason.
- **Rationale**: SCRUM-26 AC; recruiter UI shows the reason only for `REJECTED` (`recruiter-job-detail.tsx:43`, `recruiter-job-list.tsx:434`).

## R5. Coverage gate

- Not available; recorded as n/a (user decision, option a), rerun if the tooling merges first.
