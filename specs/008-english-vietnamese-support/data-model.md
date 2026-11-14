# Data Model: English and Vietnamese Language Support

No database change. Two client-side data shapes:

## Locale

- Values: `'vi' | 'en'`; default `'vi'`.
- Stored in the cookie `locale` (`path=/`, `max-age=31536000`, `samesite=lax`, not httpOnly so the switcher can write it).
- Read rule: a cookie value outside `vi`/`en`, or no cookie, is `'vi'` (spec FR-002, Edge Cases).

## Message catalogue

- One JSON file per locale: `apps/web/messages/vi.json`, `apps/web/messages/en.json`.
- Top-level keys are namespaces; values are strings (ICU message syntax).
- Validation rule: both files have exactly the same key set (unit test U2).
- Namespaces in this Story:
  - `common`: the two language names (`languages.vi`, `languages.en`), written in their own language.
  - `header`: the switcher's accessible name.
  - `errors`: one key per `ErrorCode` from `@launchly/shared` (20), plus `generic`, `network`, `serverUnavailable`, `invalidResponse`.
