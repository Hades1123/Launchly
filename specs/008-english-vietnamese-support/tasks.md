---
description: 'Task list for SCRUM-91 English and Vietnamese language support'
---

# Tasks: English and Vietnamese Language Support

**Input**: `specs/008-english-vietnamese-support/` (plan.md, research.md, data-model.md, contracts/locale-and-messages.md)

**Tests**: TDD. Unit tests (Vitest) for pure logic: write, run RED (a failing assertion, not a missing-module error), implement, run GREEN. Playwright e2e per acceptance criterion and edge case: write, run RED against the missing UI, build, run GREEN. Test ids refer to the plan's Test plan table.

## Phase 1: Setup

- [ ] T001 Add `next-intl@^4.15.1` to dependencies and `vitest@^5.0.5`, `@vitest/coverage-v8@5.0.5` to devDependencies in apps/web/package.json, with scripts `"test": "vitest run --passWithNoTests"` and `"test:coverage": "vitest run --passWithNoTests --coverage"`; run `pnpm install`
- [ ] T002 Create apps/web/vitest.config.ts (`@` alias to `./src`, `include: ['src/**/*.test.ts']`, coverage v8 over `src/**/*.{ts,tsx}` excluding tests, reporters `text-summary`, `json-summary`, `json`)

## Phase 2: Foundational (blocks every story)

- [ ] T003 Write apps/web/src/i18n/locale.test.ts: U1 `parseLocale('vi'|'en')` returns it, `undefined`/`''`/`'fr'` return `'vi'`; U2 the flattened key sets of `messages/vi.json` and `messages/en.json` are equal; run RED
- [ ] T004 Create apps/web/messages/vi.json and apps/web/messages/en.json with namespaces `common` (`languages.vi` "Tiếng Việt", `languages.en` "English", the same in both files), `header` (`language`), `errors` (one key per value of `errorCodeSchema`, 20 keys, plus `generic`, `network`, `serverUnavailable`, `invalidResponse`). The Vietnamese texts reuse the current wording in apps/web/src/lib/auth-helpers.ts and apps/web/src/lib/api/http.ts
- [ ] T005 Create apps/web/src/i18n/locale.ts: `LOCALES = ['vi','en']`, `type Locale`, `DEFAULT_LOCALE = 'vi'`, `LOCALE_COOKIE = 'locale'`, `parseLocale(value)` ("Anything else, or no cookie, means `vi`"), `clientLocale()` (reads `document.cookie` in the browser, `'vi'` on the server), and `catalogues: Record<Locale, Messages>` where `en` is `vi` deep-merged with `en.json` (E3); GREEN for U1, U2
- [ ] T006 Create apps/web/src/i18n/request.ts (`getRequestConfig`: `parseLocale` of the `locale` cookie from `cookies()`, `messages: catalogues[locale]`, `timeZone: 'Asia/Ho_Chi_Minh'`, `formats.dateTime.moderation = { dateStyle: 'medium', timeStyle: 'short' }`) and wrap apps/web/next.config.ts with `createNextIntlPlugin('./src/i18n/request.ts')`
- [ ] T007 Update apps/web/src/app/layout.tsx: async, `<html lang={await getLocale()}>`, wrap children in `<NextIntlClientProvider>` outside `AuthProvider`

**Checkpoint**: `pnpm --filter @launchly/web typecheck` passes and the app renders unchanged in Vietnamese.

## Phase 3: User Stories 1 and 2 - Switch the language, choice remembered (P1) 🎯 MVP

US1 and US2 ship together: the switcher writes the cookie that makes the choice stick.

**Independent test**: choose English in the header, reload and open another page; `html[lang=en]` holds.

- [ ] T008 [US1] Write apps/web/e2e/scrum-91-language-switch.spec.ts with AC4/E1 (fresh context → `html[lang=vi]`, switcher value "Tiếng Việt"), AC1 (switcher, by its accessible name, in the main header on `/jobs`, on `/login`, in the recruiter workspace after `signIn` as a seeded recruiter (desktop viewport and a 390px mobile viewport), and in the admin header after `signIn` as the seeded admin), AC2/E2 (choose English on `/jobs` → same URL and `html[lang=en]`; reload → still `en`; open `/` → still `en`); run RED
- [ ] T009 [US1] Create apps/web/src/components/layout/language-switcher.tsx (`'use client'`; native `<select>` with `aria-label={t('header.language')}`, options from `common.languages`, value from `useLocale()`; on change write `locale=<value>; path=/; max-age=31536000; samesite=lax` and `router.refresh()`; semantic tokens only)
- [ ] T010 [US1] Add `<LanguageSwitcher />` to apps/web/src/components/layout/site-header.tsx, apps/web/src/components/auth/auth-shell.tsx, apps/web/src/components/recruiter/recruiter-shell.tsx (desktop sidebar and the mobile top bar) and apps/web/src/components/admin/admin-shell.tsx; GREEN for AC1, AC2/E2, AC4/E1, and rerun apps/web/e2e/scrum-84-site-header.spec.ts (the header layout must still hold at 1280px and on mobile)

## Phase 4: User Story 3 - Errors in the chosen language (P2)

**Independent test**: in English, sign in with a wrong password; the error is in English.

- [ ] T011 [US3] Write apps/web/src/lib/i18n/error-message.test.ts: U3 for every value of `errorCodeSchema.options` and both locales, `errorMessage(new ApiError(code, 'x', 400), locale)` is non-empty and not the raw key; U4 `ApiError` with status 0 → `errors.network` text, `new Error()` / `undefined` → `errors.generic` text, and the `en` output differs from the `vi` output for `INVALID_CREDENTIALS`; run RED
- [ ] T012 [US3] Create apps/web/src/lib/i18n/error-message.ts (`errorMessage(error: unknown, locale: Locale): string` per contracts/locale-and-messages.md); GREEN for U3, U4
- [ ] T013 [US3] Make `authErrorMessage(error)` in apps/web/src/lib/auth-helpers.ts return `errorMessage(error, clientLocale())` (signature unchanged), and build the three own fallback messages in apps/web/src/lib/api/http.ts from `catalogues[clientLocale()].errors` (`network`, `serverUnavailable`, `invalidResponse`)
- [ ] T014 [US3] Add AC3/E4 to apps/web/e2e/scrum-91-language-switch.spec.ts: on `/login` in English, a wrong password shows the English `INVALID_CREDENTIALS` text; after switching to Tiếng Việt, the Vietnamese one; run GREEN

## Phase 5: User Story 4 - Dates and numbers in the chosen language (P3)

**Independent test**: a public job detail's posted date changes format between vi and en.

- [ ] T015 [US4] Add AC5 to apps/web/e2e/scrum-91-language-switch.spec.ts: on a seeded public job's detail page, the posted date in Vietnamese contains "thg" and in English an English month abbreviation; run RED
- [ ] T016 [US4] Replace the hard-coded formatters with `useFormatter()` (`format.dateTime`, `format.number`) in apps/web/src/components/jobs/job-detail.tsx, apps/web/src/components/applications/application-timeline.tsx, apps/web/src/app/profile/components/cv-viewer.tsx, apps/web/src/components/recruiter/recruiter-job-list.tsx, apps/web/src/components/recruiter/recruiter-job-detail.tsx, apps/web/src/components/recruiter/applicants-table.tsx, apps/web/src/components/recruiter/job-status-badge.tsx, apps/web/src/components/recruiter/job-posting-form.tsx; GREEN for AC5
- [ ] T017 [US4] Remove the exported `moderationDate` from apps/web/src/components/admin/pending-company-list.tsx and use `format.dateTime(date, 'moderation')` there and in apps/web/src/components/admin/company-review.tsx, apps/web/src/components/admin/job-review.tsx, apps/web/src/components/admin/pending-job-list.tsx

## Phase 6: Polish

- [ ] T018 Run the unit gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`; the Frontend Conventions token self-check prints nothing; `git diff --stat origin/main...HEAD` handwritten lines ≤ 300 (otherwise stop and propose moving US4 to its own PR)
- [ ] T019 Run the full e2e suite `pnpm --filter @launchly/web test:e2e`; existing specs that locate by Vietnamese text must still pass under the default locale

## Dependencies

- Phase 1 → Phase 2 → Phases 3, 4, 5 (independent of each other once Phase 2 is done; T014 and T015 extend the spec file from T008, so run them after T008) → Phase 6.

## Parallel opportunities

- T003 and T004 touch different files and can be written together; T011 can be written in parallel with Phase 3.
- T016 and T017 touch disjoint files.

## Implementation strategy

MVP = Phases 1–3 (switcher + remembered choice). Then US3 (errors), then US4 (formatting), each committed separately: `feat(web): SCRUM-91 <summary>`.
