# Wave 3 — User-facing flows

Plan approved by: nvdson2005 at 4c3d887 (2026-11-13)

Wave plan source: `docs/plans/mvp-wave-plan.md` · Branch: `feat/wave-3-user-facing-flows` · Sprint: `SCRUM Sprint 3` (id 4)

## Tickets

Build order: SCRUM-61 (shared → api → web, also edits the job detail page), SCRUM-58, SCRUM-59. No ticket depends on another in this wave; all external dependencies (SCRUM-48, 53, 54, 56) are merged on `origin/main`.

| Key      | Title                                                        | Label   | Areas         | Depends on         | Assignee          |
| -------- | ------------------------------------------------------------ | ------- | ------------- | ------------------ | ----------------- |
| SCRUM-61 | CV fit check on the CV review page with AI consent           | feature | shared, api, web | SCRUM-56, SCRUM-53 | SƠN NGUYỄN VÕ ĐỨC |
| SCRUM-58 | Candidate applies from the job detail page                   | feature | web           | SCRUM-48, SCRUM-53 | VĂN NGUYỄN THIÊN  |
| SCRUM-59 | Replace mock My Applications page with real status tracking  | feature | web           | SCRUM-54           | QUÝ PHẠM DUY      |

## Clarifications

All answered "defaults" by the user.

| #   | Ticket     | Question                              | Answer (all default)                                                                                                                                                                                                 | Source |
| --- | ---------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q1  | 61         | Where is the consent stored?          | Reuse `CandidateProfile.aiConsentAcceptedAt` (Wave 2 migration). No migration; the `db` area is a no-op.                                                                                                            | user   |
| Q2  | 61         | Consent endpoint                      | `POST /candidates/me/ai-consent`, candidate only, idempotent (keeps the first timestamp), returns the profile. `candidateProfileSchema` gains `aiConsentAcceptedAt: string \| null`.                                  | user   |
| Q3  | 61         | CV list source                        | `GET /candidates/profile` (`resumes[]`, newest first). No new endpoint.                                                                                                                                              | user   |
| Q4  | 58, 59, 61 | UI copy language                      | English.                                                                                                                                                                                                             | user   |
| Q5  | 58         | e2e writes to the shared seeded DB    | Spec uses a seeded candidate and a job they have not applied to. A `beforeAll` helper (`apps/web/e2e/helpers/db.ts`) runs `apps/api/prisma/seed/e2e-reset.ts` (Prisma, no new dependency) to delete that application and reset consent, so reruns pass. | user   |
| Q6  | 58         | Already-applied detection             | Client `JobActions` loads `GET /applications/me` for candidates and matches `jobId`; the detail page stays a server component.                                                                                       | user   |
| Q7  | 59         | Round list per application            | List uses `currentStageName`; expanding fetches `GET /applications/:id` and renders history + stages with the current stage marked.                                                                                  | user   |
| Q8  | 59         | Mock-only widgets                     | Delete `FeedbackLog`, `PrepChecklist`, spotlight and `mock-applications.ts`. `?application=<id>` preselects one.                                                                                                      | user   |
| Q9  | 61         | Result display                        | Reuse the score gauge, skill breakdown and action plan fed from `AssessmentDto`; drop `ApplyBar` and `PrivacyToggle`; delete `mock-cv-review.ts`.                                                                    | user   |
| Q10 | 61         | e2e AI                                | API e2e server env sets `AI_DRIVER=mock`; the spec resets consent first for the "no consent" case.                                                                                                                   | user   |

## Cross-ticket changes

- `apps/web/src/app/(main)/jobs/[id]/page.tsx`: SCRUM-61 replaces the disabled "Check my CV fit" button with a link to `/cv-review?jobId=<id>`; SCRUM-58 replaces the disabled "Apply" button with the client `JobActions` apply dialog. Both live in the `job-actions` slot; 61 lands first, 58 rebases on it.
- `apps/web/src/lib/api/candidate.ts`: SCRUM-61 adds `acceptAiConsent`. New `apps/web/src/lib/api/applications.ts`: SCRUM-58 (create, list mine) and SCRUM-59 (detail) both append. New `apps/web/src/lib/api/assessments.ts`: SCRUM-61.
- `apps/web/e2e/helpers/db.ts` and `apps/api/prisma/seed/e2e-reset.ts`: created by SCRUM-58, reused by SCRUM-61 (consent reset) and SCRUM-59 (no write needed; reads seeded applications).
- `apps/web/playwright.config.ts`: SCRUM-61 adds `AI_DRIVER: 'mock'` to the API server env.
- No Prisma migration in this wave.

## Constitution Check

- I. Shared Contracts First: pass. `aiConsentAcceptedAt` is added to the shared profile schema; web parses every reply with shared schemas.
- II. Layered Modular Monolith: pass. Consent endpoint is route → controller → service → Prisma in the candidate module.
- III. Secure by Default: pass. Consent endpoint is candidate-only; analysis still blocked server-side without consent; Apply hidden for recruiter/admin and enforced by the API role guard.
- IV. Tested Business Logic: pass. TDD, every AC mapped below. Wave delivery exception declared in the Jira comments.
- V. Safe Data Evolution: pass. No schema change.
- VI. Simplicity and Pinned Dependencies: pass. No new dependency.

## SCRUM-61 — CV fit check on the CV review page with AI consent

### User story

As a candidate, I want to pick my CV and a job (or paste a job description) and run a fit check after agreeing to how my data is used, so that I get feedback while staying in control of my personal data.

### Acceptance criteria

- AC1: No mock data remains on `/cv-review`.
- AC2: Analysis cannot run before consent; consent persists across sessions.
- AC3: The "Check my CV fit" button on the job detail page opens `/cv-review?jobId=<id>` with the job preselected.
- AC4: Playwright e2e with `AI_DRIVER=mock`.
- AC5 (API): `POST /candidates/me/ai-consent` sets `aiConsentAcceptedAt` once (idempotent), is candidate-only, and the profile DTO exposes the field.
- AC6: Unreadable CV / timeout errors show the API's message; loading state shown while analysing.

### Files

- Modify: `packages/shared/src/schemas/candidate-profile.ts`, `apps/api/src/modules/candidate/candidate.{routes,controller,service}.ts`, `apps/web/src/app/(main)/cv-review/page.tsx`, `apps/web/src/lib/api/candidate.ts`, `apps/web/src/components/cv-review/*`, `apps/web/src/app/(main)/jobs/[id]/page.tsx`, `apps/web/playwright.config.ts`
- Create: `apps/api/src/modules/candidate/candidate-ai-consent.test.ts`, `apps/web/src/lib/api/assessments.ts`, `apps/web/src/components/cv-review/{consent-box,fit-check-form}.tsx`, `apps/web/e2e/scrum-61-cv-fit-check.spec.ts`, `apps/web/e2e/helpers/db.ts`
- Remove: `apps/web/src/components/cv-review/{mock-cv-review.ts,privacy-toggle.tsx}`, `ApplyBar`

### Test cases

| ID  | Type        | File::test name                                                                                          | Proves  |
| --- | ----------- | -------------------------------------------------------------------------------------------------------- | ------- |
| T1  | unit        | `packages/shared/src/schemas/candidate-profile.test.ts::profile schema accepts aiConsentAcceptedAt`      | AC5     |
| T2  | integration | `candidate-ai-consent.test.ts::POST /candidates/me/ai-consent stores the consent time and returns it`    | AC5     |
| T3  | integration | `candidate-ai-consent.test.ts::a second call keeps the first timestamp`                                  | AC5     |
| T4  | integration | `candidate-ai-consent.test.ts::recruiter gets 403 and anonymous gets 401`                                | AC5     |
| T5  | integration | `candidate-ai-consent.test.ts::GET /candidates/profile exposes aiConsentAcceptedAt (null before consent)` | AC2, AC5 |
| T6  | e2e         | `scrum-61-cv-fit-check.spec.ts::AC1: no mock data remains on the CV review page`                         | AC1     |
| T7  | e2e         | `scrum-61-cv-fit-check.spec.ts::AC2: analysis is blocked until the candidate agrees, and consent persists after reload` | AC2 |
| T8  | e2e         | `scrum-61-cv-fit-check.spec.ts::AC3: Check my CV fit on the job page opens the review with the job preselected` | AC3 |
| T9  | e2e         | `scrum-61-cv-fit-check.spec.ts::AC4: a consenting candidate analyses a CV against a job and sees the score` | AC4, AC6 |
| T10 | e2e         | `scrum-61-cv-fit-check.spec.ts::AC6: an API error is shown with its message`                             | AC6     |

## SCRUM-58 — Candidate applies from the job detail page

### User story

As a candidate, I want to apply from the job page in at most two steps (pick a CV, optionally write a short cover letter), so that applying is not tedious.

### Acceptance criteria

- AC1: Candidate with a CV applies in ≤2 steps (open dialog, submit); CV select defaults to the newest; cover letter optional with a ≤2000 char counter.
- AC2: API errors (409 duplicate, 404 closed job) show readable messages. Not logged in → redirect to login and back; recruiter/admin → button hidden; no CV → message linking to `/profile`; already applied → disabled "Applied".
- AC3: Design tokens only; usable at phone width.
- AC4: Playwright e2e: log in → open job → apply → see "Applied".

### Files

- Create: `apps/web/src/components/jobs/job-actions.tsx`, `apps/web/src/components/jobs/apply-dialog.tsx`, `apps/web/src/lib/api/applications.ts`, `apps/web/e2e/scrum-58-apply.spec.ts`, `apps/api/prisma/seed/e2e-reset.ts`
- Modify: `apps/web/src/app/(main)/jobs/[id]/page.tsx`

### Test cases

| ID  | Type | File::test name                                                                                           | Proves  |
| --- | ---- | --------------------------------------------------------------------------------------------------------- | ------- |
| T11 | e2e  | `scrum-58-apply.spec.ts::AC1: a candidate with a CV applies in two steps and the button becomes Applied`  | AC1, AC4 |
| T12 | e2e  | `scrum-58-apply.spec.ts::AC1: the cover letter counter stops at 2000 characters`                          | AC1     |
| T13 | e2e  | `scrum-58-apply.spec.ts::AC2: an anonymous visitor is sent to login and returns to the job`               | AC2     |
| T14 | e2e  | `scrum-58-apply.spec.ts::AC2: a recruiter does not see the Apply button`                                  | AC2     |
| T15 | e2e  | `scrum-58-apply.spec.ts::AC2: a candidate without a CV sees a link to the profile`                        | AC2     |
| T16 | e2e  | `scrum-58-apply.spec.ts::AC2: an already applied job shows a disabled Applied button`                     | AC2     |
| T17 | e2e  | `scrum-58-apply.spec.ts::AC2: a 409 duplicate and a 404 closed job show readable messages` (route-mocked API replies) | AC2 |
| T18 | e2e  | `scrum-58-apply.spec.ts::AC3: the apply dialog fits a phone width without horizontal scroll`              | AC3     |

AC3 "tokens only" is enforced by lint plus the agent review against `docs/Frontend-Conventions.md`.

## SCRUM-59 — Replace mock My Applications page with real status tracking

### User story

As a candidate, I want my applications page to show the real status of each application and the round I am in, so that I know what happens next.

### Acceptance criteria

- AC1: No mock data remains in the page; rows load from `GET /applications/me` (job title link, company, status badge, current round, last update).
- AC2: A status changed by a recruiter shows after reload.
- AC3: Rejected/withdrawn are shown as final states; expanding a row shows a status stepper from history plus the job's rounds with the current one marked.
- AC4: Empty state links to `/jobs`. Design tokens only; usable at phone width.
- AC5: Playwright e2e: applied job appears with status "Submitted".

### Files

- Modify: `apps/web/src/app/(main)/applications/page.tsx`, `apps/web/src/lib/api/applications.ts`
- Create: `apps/web/src/components/applications/{application-list,application-row,status-badge}.tsx`, `apps/web/e2e/scrum-59-my-applications.spec.ts`
- Remove: `apps/web/src/components/applications/{mock-applications.ts,application-overview.tsx,application-spotlight.tsx,feedback-log.tsx,other-applications.tsx,prep-checklist.tsx}` (stepper kept and rewired to history/stages)

### Test cases

| ID  | Type | File::test name                                                                                      | Proves   |
| --- | ---- | ---------------------------------------------------------------------------------------------------- | -------- |
| T19 | e2e  | `scrum-59-my-applications.spec.ts::AC1: rows show job link, company, status, round and last update, with no mock banner` | AC1 |
| T20 | e2e  | `scrum-59-my-applications.spec.ts::AC5: an applied job appears with status Submitted`                | AC5      |
| T21 | e2e  | `scrum-59-my-applications.spec.ts::AC2: a status change by the API shows after reload`               | AC2      |
| T22 | e2e  | `scrum-59-my-applications.spec.ts::AC3: a rejected application is shown as a final state`            | AC3      |
| T23 | e2e  | `scrum-59-my-applications.spec.ts::AC3: expanding a row shows the status stepper and the current round` | AC3   |
| T24 | e2e  | `scrum-59-my-applications.spec.ts::AC4: a candidate with no applications sees the empty state linking to jobs` | AC4 |
| T25 | e2e  | `scrum-59-my-applications.spec.ts::AC4: the list fits a phone width without horizontal scroll`       | AC4      |
