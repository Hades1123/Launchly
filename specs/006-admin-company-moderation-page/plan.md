# Implementation Plan: Admin Moderation Page for Companies

**Branch**: `feat/SCRUM-72-admin-company-moderation-page` (stacked on SCRUM-71) | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/006-admin-company-moderation-page/spec.md` (Jira SCRUM-72, subtask SCRUM-78 web)

## Summary

Add an admin area to `apps/web`: an `AdminShell` guard (client, like `RecruiterShell`) on `app/admin/layout.tsx`, a `/admin/moderation` page with a tab bar (Companies now, Jobs in SCRUM-74), a `/admin/moderation/companies/[id]` review page with approve and a reusable `RejectDialog` (native `<dialog>`, as in `delete-draft-button.tsx`), an admin entry in the account menu, and the rejection reason plus "Đăng ký công ty khác" link in the recruiter shell. Data comes from SCRUM-71's `/admin/companies` API through a new `lib/api/admin-companies.ts` that parses with the shared schemas.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19 / Next.js (App Router)

**Primary Dependencies**: `@launchly/shared` schemas, existing `request()` client, `Badge`, `Button`, lucide icons, Tailwind semantic tokens

**Storage**: none (API from SCRUM-71)

**Testing**: Playwright (`apps/web/e2e/scrum-72-admin-company-moderation.spec.ts`); no web unit runner. Changed-file coverage applies to `src/**` with a coverage report; `apps/web` has no `test:coverage`, so web files are covered by e2e only (recorded in the PR)

**Target Platform**: browser

**Project Type**: web application (frontend only)

**Performance Goals**: none beyond normal page load

**Constraints**: ~300 handwritten lines guide; semantic tokens only; client components; no new dependencies

**Scale/Scope**: 3 routes, 5 components, 1 API module, 2 changed components

## Constitution Check

| Principle                    | Check                                                                                                                          | Status                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| I. Shared Contracts First    | Responses parsed with `adminCompanySchema` / `companyDtoSchema`; no new schema                                                 | Pass                   |
| II. Layered Modular Monolith | UI calls the API only through `lib/api/*`                                                                                      | Pass                   |
| III. Secure by Default       | Server enforces ADMIN (SCRUM-71); the client guard only hides UI. Owner email shown only on admin pages                        | Pass                   |
| IV. Tested Business Logic    | Every AC and E-id has a Playwright test. No web unit runner and no web coverage command: recorded as a gap, as in Waves 1 to 3 | Pass with recorded gap |
| V. Safe Data Evolution       | No data change                                                                                                                 | Pass                   |
| VI. Simplicity               | Native `<dialog>`; reuses `Badge`, `Button`, shell patterns                                                                    | Pass                   |

## Project Structure

```text
apps/web/src/
├── app/admin/layout.tsx                             ← new: <AdminShell>
├── app/admin/moderation/page.tsx                    ← new: tabs + company queue
├── app/admin/moderation/companies/[id]/page.tsx     ← new: review page
├── components/admin/admin-shell.tsx                 ← new: auth guard and header
├── components/admin/moderation-tabs.tsx             ← new: Companies | Jobs (Jobs added in SCRUM-74)
├── components/admin/pending-company-list.tsx        ← new
├── components/admin/company-review.tsx              ← new: details, approve, reject, decided state
├── components/admin/reject-dialog.tsx               ← new: generic onSubmit(reason)
├── lib/api/admin-companies.ts                       ← new
├── components/layout/user-menu.tsx                  ← ADMIN entry
└── components/recruiter/recruiter-shell.tsx         ← reason + "Đăng ký công ty khác"
apps/web/e2e/scrum-72-admin-company-moderation.spec.ts  ← new (reuses helpers/db resetModeration)
```

**Structure Decision**: mirrors `app/recruiter` + `components/recruiter`.

## Complexity Tracking

No violations to justify.
