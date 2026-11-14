# Research: English and Vietnamese Language Support

## R1. Library: next-intl without locale routing

- **Decision**: `next-intl@4.15.1` in "without i18n routing" mode. `src/i18n/request.ts` (`getRequestConfig`) reads the `locale` cookie, picks the catalogue, and is registered with `createNextIntlPlugin` in `next.config.ts`. The root layout renders `<NextIntlClientProvider>` (v4 passes locale and messages to client components by itself) and sets `<html lang={await getLocale()}>`.
- **Rationale**: SCRUM-98 D1; the peer range covers `next ^16` and `react ^19`. "Without routing" keeps every URL, so no existing e2e spec or link changes. It also gives server and client components the same `useTranslations` / `useFormatter` API.
- **Alternatives considered**: `/vi` and `/en` URL prefixes (rejected in SCRUM-98: every URL and spec changes); a hand-written React context (rejected: re-implements message lookup, plurals and formatting that next-intl already tests).

## R2. Switching and remembering the choice

- **Decision**: a client `LanguageSwitcher` (native `<select>`) writes `locale=<vi|en>; path=/; max-age=31536000; samesite=lax` with `document.cookie`, then calls `router.refresh()`. The server re-renders with the new cookie, so `lang`, text and formats change without leaving the page.
- **Rationale**: no server action or API route is needed; the cookie is the only state (spec D2, FR-005). A native `<select>` is keyboard-usable and exposes the current value to assistive technology without extra code (FR-012).
- **Alternatives considered**: a server action setting the cookie (more moving parts for the same result); `localStorage` (the server could not read it, so the first paint would be in the wrong language).
- **Note**: reading `cookies()` in the root layout makes every route dynamic. No route uses static rendering or `revalidate` today (`grep` found none), so behaviour is unchanged.

## R3. Missing translations fall back to Vietnamese

- **Decision**: for `en`, `request.ts` deep-merges `en.json` over `vi.json`, so a key missing in English resolves to the Vietnamese text (E3). A unit test asserts that both catalogues have identical key sets, so the fallback is a safety net, never the normal path. An unknown cookie value resolves to `vi`.
- **Alternatives considered**: next-intl `getMessageFallback` (it receives the key, not the Vietnamese text, so it cannot satisfy E3 alone).

## R4. Error messages in the chosen language

- **Decision**: a pure function `errorMessage(error, locale)` in `src/lib/i18n/error-message.ts` maps an `ApiError` code to the `errors.<CODE>` entry of that locale's catalogue. Network failure (status 0) maps to `errors.network`, and anything else maps to `errors.generic`. `authErrorMessage(error)` keeps its signature and delegates with `clientLocale()`, which reads the `locale` cookie in the browser (default `vi`). Its 14 callers, all client event handlers or effects, stay unchanged. `http.ts` builds its own three fallback messages (cannot connect, server cannot process, invalid response) from the same catalogue and locale.
- **Rationale**: user decision (spec, Decisions record, "Error scope"). Keeping `authErrorMessage`'s signature avoids touching 14 files and keeps the diff within budget. A pure function with an explicit locale is trivial to unit-test for every `ErrorCode` (T3).
- **Alternatives considered**: a `useErrorMessage()` hook (idiomatic, but every caller changes and ~30 more lines); translating at display time from `ApiError.code` in each page (that is the SCRUM-92/93 work).
- **Bundle**: both catalogues ship in the client bundle (`http.ts` and `auth-helpers.ts` import them); a few KB, accepted.
- **Known limit**: on the server, `clientLocale()` returns `vi`, so a fallback message created during server rendering is Vietnamese. Today no server component renders `ApiError.message` from `http.ts`'s own fallbacks; the pages that call the API on the server (`/`, `/jobs`, `/jobs/[id]`) do not show it.

## R5. Dates and numbers follow the language

- **Decision**: replace each hard-coded `Intl.DateTimeFormat('vi-VN' | 'en-GB')` and `toLocaleString('en-US' | 'vi-VN')` (9 files) with next-intl `useFormatter()` (`format.dateTime`, `format.number`). The shared `moderationDate` formatter becomes a named format `moderation` declared once in `request.ts` `formats.dateTime`. `request.ts` sets `timeZone: 'Asia/Ho_Chi_Minh'` so server and browser render the same time (no hydration mismatch, no next-intl `ENVIRONMENT_FALLBACK` warning).
- **Rationale**: D4 (user, 2026-11-14). The currency symbol stays `$`; only digit grouping and date wording change (spec Assumptions).
- **Check**: no e2e spec asserts a formatted date or grouped number (`grep` on `apps/web/e2e`), so the format change breaks no existing spec.

## R6. Unit test runner for apps/web

- **Decision**: add `vitest@^5.0.5` and `@vitest/coverage-v8@5.0.5` (same versions as `apps/api` and `packages/shared`) to `apps/web` devDependencies, with `vitest.config.ts` (`@` alias, node environment) and `test` / `test:coverage` scripts, so `pnpm test` runs the web tests.
- **Rationale**: `apps/web` has no unit runner today, and the two unit tests from SCRUM-98 need one. Pinned to the repo's existing Vitest version (Principle VI).

## R7. Diff budget

The estimate of handwritten lines is about 300: catalogues ~70, i18n setup and switcher ~90, error helper and http/auth changes ~45, formatting in 9 files ~40, shells ~12, Vitest config ~20, unit tests ~50. If Phase 4 goes past 300, implementation stops and proposes a split: formatting (US4) becomes its own PR.
