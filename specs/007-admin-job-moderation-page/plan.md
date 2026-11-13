# Implementation Plan: Admin Moderation Page for Jobs

**Branch**: `feat/SCRUM-74-admin-job-moderation-page` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/007-admin-job-moderation-page/spec.md` (Jira SCRUM-74, subtask SCRUM-81 web)

## Summary

Extend the SCRUM-72 moderation page with a Jobs tab (`/admin/moderation/jobs`), a `PendingJobList`, and a `/admin/moderation/jobs/[id]` review page (`JobReview`) built like `CompanyReview`: active-guarded load, approve, the shared `RejectDialog`, CONFLICT reload, Vietnamese errors. Rounds and notes render with the candidate `HiringProcessTimeline` and `CompanyNotes` through `buildProcessView`. Data comes from SCRUM-73's `/admin/jobs` through a new `lib/api/admin-jobs.ts`.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19 / Next.js App Router

**Primary Dependencies**: `@launchly/shared` (`adminJobSchema`, `buildProcessView`, job level labels), SCRUM-72 admin components

**Storage**: none

**Testing**: Playwright `apps/web/e2e/scrum-74-admin-job-moderation.spec.ts`; the spec creates its own submitted job through the recruiter API and `resetModeration()` removes it

**Target Platform**: browser

**Project Type**: web application (frontend; one e2e-reset helper change in `apps/api/prisma`)

**Constraints**: ~300 handwritten lines guide; semantic tokens only; no new dependencies

**Scale/Scope**: 2 routes, 2 components, 1 API module, 1 changed component (tabs)

## Constitution Check

| Principle                    | Check                                                                                                          | Status                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| I. Shared Contracts First    | Parse with `adminJobSchema`; no new schema                                                                     | Pass                   |
| II. Layered Modular Monolith | UI calls the API only through `lib/api/*`                                                                      | Pass                   |
| III. Secure by Default       | Server enforces ADMIN; SCRUM-72 guard hides UI                                                                 | Pass                   |
| IV. Tested Business Logic    | Every AC and E-id has a Playwright test; no web unit runner or coverage script (recorded gap, as for SCRUM-72) | Pass with recorded gap |
| V. Safe Data Evolution       | No data change                                                                                                 | Pass                   |
| VI. Simplicity               | Reuses `RejectDialog`, the review pattern, the candidate timeline                                              | Pass                   |

## Project Structure

```text
apps/web/src/
├── app/admin/moderation/jobs/page.tsx            ← new: Jobs tab
├── app/admin/moderation/jobs/[id]/page.tsx       ← new
├── components/admin/moderation-tabs.tsx          ← add the "Tin tuyển dụng" tab
├── components/admin/pending-job-list.tsx         ← new
├── components/admin/job-review.tsx               ← new
└── lib/api/admin-jobs.ts                         ← new
apps/api/prisma/e2e-reset.ts                       ← `moderation` also deletes "E2E moderation" jobs
apps/web/e2e/scrum-74-admin-job-moderation.spec.ts ← new
```

**Structure Decision**: Jobs tab is its own route (`/admin/moderation/jobs`), so the tabs stay plain links.

## Complexity Tracking

No violations to justify.
