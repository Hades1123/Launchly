# Contract: locale cookie, catalogue keys and the error helper

Web-internal; no HTTP endpoint changes.

## Cookie

| Name | Values | Attributes | Writer | Readers |
| --- | --- | --- | --- | --- |
| `locale` | `vi`, `en` | `path=/; max-age=31536000; samesite=lax` | `LanguageSwitcher` (browser) | `src/i18n/request.ts` (server), `clientLocale()` (browser) |

Anything else, or no cookie, means `vi`.

## Catalogue keys (both `vi.json` and `en.json`)

```text
common.languages.vi          "Tiếng Việt" (same in both files)
common.languages.en          "English"    (same in both files)
header.language              switcher accessible name
errors.<ErrorCode>           20 keys, one per value of errorCodeSchema
errors.generic               unknown error / non-ApiError
errors.network               cannot reach the server (ApiError status 0)
errors.serverUnavailable     server answered with a non-JSON or unparsable error
errors.invalidResponse       2xx response failed its shared schema
```

## Functions

```ts
// src/i18n/locale.ts
type Locale = 'vi' | 'en';
parseLocale(value: string | undefined | null): Locale;   // unknown → 'vi'
clientLocale(): Locale;                                   // browser: cookie; server: 'vi'

// src/lib/i18n/error-message.ts
errorMessage(error: unknown, locale: Locale): string;
// ApiError with status 0 → errors.network
// ApiError with a known code → errors.<code>
// anything else → errors.generic
```

`authErrorMessage(error)` keeps its current signature and returns `errorMessage(error, clientLocale())`.

## Named formats (`request.ts` `formats.dateTime`)

| Name | Options | Replaces |
| --- | --- | --- |
| `moderation` | `{ dateStyle: 'medium', timeStyle: 'short' }` | `moderationDate` in `pending-company-list.tsx` |
