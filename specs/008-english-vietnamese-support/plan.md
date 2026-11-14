# Implementation Plan: English and Vietnamese Language Support

**Branch**: `feat/SCRUM-91-english-vietnamese-support` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-english-vietnamese-support/spec.md` (Jira SCRUM-91, Subtask SCRUM-98)

## Summary

Add Vietnamese (default) and English to `apps/web` with next-intl in "without routing" mode. A `locale` cookie holds the choice. A native `<select>` switcher in all four page frames writes it and refreshes the page. The root layout sets `lang` and provides messages. A pure `errorMessage(error, locale)` maps every shared `ErrorCode` to a translated message; it backs `authErrorMessage` and `http.ts`'s own fallback messages. Dates and numbers switch to next-intl's `useFormatter`. Vitest is added to `apps/web` for the catalogue and error-mapping unit tests. No API, shared-schema or database change. Details in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node 22, React 19, Next.js 16 (App Router)

**Primary Dependencies**: `next-intl@^4.15.1` (new, runtime); `vitest@^5.0.5`, `@vitest/coverage-v8@5.0.5` (new to `apps/web`, dev, same versions as the other packages)

**Storage**: a browser cookie `locale` (`vi` | `en`, one year, `path=/`, `samesite=lax`)

**Testing**: Vitest unit tests in `apps/web/src/**/*.test.ts`; Playwright e2e `apps/web/e2e/scrum-91-language-switch.spec.ts`

**Target Platform**: modern browsers, desktop and mobile

**Project Type**: web app (frontend-only change in the pnpm monorepo)

**Performance Goals**: switching re-renders the current page once (`router.refresh()`); no extra network calls beyond that

**Constraints**: no URL changes; no raw message keys on screen; Frontend Conventions (semantic tokens only, `@/` imports); handwritten diff ≤ 300 lines

**Scale/Scope**: 2 locales, 3 namespaces (`common` 2 keys, `header` 1, `errors` 24); 4 page frames get the switcher; 9 files change formatting

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --- | --- | --- |
| I. Shared Contracts First | Pass | Reuses `errorCodeSchema` / `ErrorCode` from `@launchly/shared`; no new web/API shapes. |
| II. Layered Modular Monolith | Pass | Web-only; the browser still reaches the API through `/api/*`; `@/` imports. |
| III. Secure by Default | Pass | The cookie holds only `vi`/`en`, is validated on read (unknown → `vi`), and carries no secret. |
| IV. Tested Business Logic | Deviation, approved by a person (see Complexity Tracking) | Unit tests for catalogue parity and error mapping (RED → GREEN); e2e for each AC and E1–E4. The coverage gate is waived by the user (spec, Decisions record): `pn coverage:changed` does not exist. |
| V. Safe Data Evolution | N/A | No schema or env change. |
| VI. Simplicity and Pinned Dependencies | Pass | One runtime dependency, justified by the Story (SCRUM-98 D1). Vitest uses the repo's existing version. No custom i18n framework. |

Post-design re-check (after Phase 1): unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/008-english-vietnamese-support/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── locale-and-messages.md
├── checklists/
│   ├── requirements.md
│   └── i18n.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── package.json                         # + next-intl, vitest, test scripts
├── vitest.config.ts                     # new
├── next.config.ts                       # wrap with createNextIntlPlugin
├── messages/
│   ├── vi.json                          # new: common, header, errors
│   └── en.json                          # new
├── e2e/scrum-91-language-switch.spec.ts # new
└── src/
    ├── i18n/
    │   ├── locale.ts                    # new: LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, clientLocale, catalogues
    │   ├── locale.test.ts               # new: parseLocale + catalogue key parity (E1, E3)
    │   └── request.ts                   # new: getRequestConfig (cookie → locale, vi fallback merge, timeZone, formats)
    ├── lib/
    │   ├── i18n/error-message.ts        # new: errorMessage(error, locale)
    │   ├── i18n/error-message.test.ts   # new: every ErrorCode, network, unknown (E4, T3)
    │   ├── auth-helpers.ts              # authErrorMessage → errorMessage(error, clientLocale())
    │   └── api/http.ts                  # own fallback messages from the catalogue
    ├── app/layout.tsx                   # provider + lang
    └── components/
        ├── layout/language-switcher.tsx # new
        ├── layout/site-header.tsx       # + switcher
        ├── auth/auth-shell.tsx          # + switcher
        ├── recruiter/recruiter-shell.tsx# + switcher (desktop sidebar + mobile bar)
        ├── admin/admin-shell.tsx        # + switcher
        └── (9 formatting files)         # useFormatter: cv-viewer, recruiter-job-list, job-status-badge,
                                         # applicants-table, application-timeline, job-detail,
                                         # job-posting-form, recruiter-job-detail, pending-company-list
                                         # (+ its moderationDate users company-review, job-review, pending-job-list)
```

**Structure Decision**: frontend-only, inside `apps/web`. Locale plumbing lives in `src/i18n/` (next-intl's conventional path for `request.ts`). The error helper sits next to the other `lib/` helpers. Message catalogues live at `apps/web/messages/` as SCRUM-98 D3 names them.

## Test plan

| Id | Level | File | Covers |
| --- | --- | --- | --- |
| U1 | unit | `src/i18n/locale.test.ts` | `parseLocale`: `vi`, `en`, missing, unknown → `vi` (E1, invalid cookie) |
| U2 | unit | `src/i18n/locale.test.ts` | `vi.json` and `en.json` have identical key sets (E3) |
| U3 | unit | `src/lib/i18n/error-message.test.ts` | every `ErrorCode` has a non-empty message in both locales and differs from the key (T3, FR-008) |
| U4 | unit | `src/lib/i18n/error-message.test.ts` | status 0 → network message; non-`ApiError` → generic; per-locale output (E4) |
| AC1 | e2e | `e2e/scrum-91-language-switch.spec.ts` | switcher in the main header, sign-in frame, recruiter workspace and admin header |
| AC2/E2 | e2e | same | choose English → reload and another page stay English (`html[lang=en]`) |
| AC3/E4 | e2e | same | wrong password on sign-in shows the English message in English, the Vietnamese one in Vietnamese |
| AC4/E1 | e2e | same | fresh context → `html[lang=vi]`, switcher shows Tiếng Việt |
| AC5 | e2e | same | a public job detail's posted date changes format between vi and en |
| E3 | unit | U2 | covered by key parity plus the merge in `request.ts` |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle IV changed-file coverage gate (≥80 % lines and branches) not enforced | `pn coverage:changed` does not exist yet, and most changed files are React components (switcher, shells, formatting) without a component-test setup in `apps/web`. A person waived the gate (user, 2026-11-14; spec Decisions record). | Measuring `apps/web/coverage/coverage-summary.json` by hand (Wave 5/6 method) was offered and declined by the user. The unit tests still cover all pure logic (`parseLocale`, catalogue parity, `errorMessage`), and e2e covers every acceptance criterion. |
