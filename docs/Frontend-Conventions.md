# Frontend Conventions

Rules for `apps/web`. Design tokens live in one place: `apps/web/src/app/globals.css`.

## 1. Layout of `apps/web/src`

Target structure. Create folders only when a ticket needs them.

- `app/`: routes, layouts, and `globals.css`.
- `components/ui/`: generic primitives (button, input, badge).
- `components/layout/`: app shell (header, nav, footer).
- `components/<feature>/`: feature-specific components.
- `lib/`: helpers.
- `lib/api/`: the API layer: `http.ts` plus one service file per backend module (`auth.ts`, `candidate.ts`, `company.ts`, `jobs.ts`).

## 2. Naming

- File names use kebab-case (`job-card.tsx`).
- Component exports use PascalCase (`JobCard`).
- Import same-app files with the `@/` alias (maps to `src/`), not `../` paths.

## 3. Components

- Components are Server Components by default.
- Add `'use client'` only for interactivity (state, effects, event handlers).

## 4. Contracts

Forms and API responses reuse the Zod schemas from `@launchly/shared` (constitution Principle I). Do not hand-write duplicate types, and never import Prisma types in the frontend.

### Calling the API

- Pages and components call service functions from `lib/api/<module>.ts` (`getCandidateProfile()`, `searchJobs(filters)`). They never call `fetch` or write an endpoint URL themselves; each endpoint is defined once, in its service file.
- Service functions are built on `request()`, `requestVoid()` and `requestBlob()` from `lib/api/http.ts`, and pass the shared Zod schema so every response is validated.
- `http.ts` wraps the native `fetch`, so the same services work in Server Components (they call `API_URL` directly and accept Next.js caching options such as `{ cache: 'no-store' }` or `{ next: { revalidate } }`) and in the browser (through the `/api` rewrite).
- In the browser, `http.ts` attaches the in-memory access token and, on a 401, refreshes it once and retries. Public auth endpoints (login, register...) pass `auth: false`.
- Failures reject with `ApiError` (`code`, `status`, `details`) built from the shared `apiErrorSchema`; map codes to user-facing text in the UI.

### Async code

- Write asynchronous code with `async/await` and `try/catch/finally`. Use `.then()` only when you need the Promise object itself, for example to cache or share an in-flight request (`refreshAccessToken()` in `http.ts`). Do not mix the two in one function.
- Run independent requests together with `await Promise.all([...])` instead of awaiting them one after another.
- A `useEffect` callback cannot be `async`: declare an inner `async function load()`, call it with `void load()`, and guard state updates with an `active` flag that the cleanup sets to `false`.

## 5. Token rules

- Style with semantic utilities only (`bg-primary`, `text-muted-foreground`, `rounded-card`).
- Never use raw palette classes (`bg-indigo-600`) or arbitrary values (`bg-[#4f46e5]`, `text-[13px]`) in components.
- Add or rename a token only in `globals.css` and in the table below, in the same PR.
- The type scale, spacing, and breakpoints are Tailwind defaults.
- Class order is handled by `prettier-plugin-tailwindcss`; run `pn format`.

Self-check, which must print nothing:

```bash
grep -rnE '\b(bg|text|border|ring|from|to|via|fill|stroke|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b|-\[(#|[0-9]|rgb|hsl|oklch)' apps/web/src --include='*.tsx' --include='*.ts'
```

## 6. Token table

Values come from the "Career Launch Engine" design system in the Stitch project "Launchly Frontend Web Platform". Hex values are Stitch's Material-style roles; `subtle-foreground` is darkened from Stitch `outline` (`#777587`) to pass 4.5:1 on tinted surfaces.

| CSS variable                         | Example utility                        | Value (Stitch role)                    | Intended use                               |
| ------------------------------------ | -------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `--font-sans`                        | `font-sans`                            | Inter                                  | Body text, controls, data (default)        |
| `--font-display`                     | `font-display`                         | Plus Jakarta Sans                      | Headings, titles, salary figures           |
| `--font-mono`                        | `font-mono`                            | JetBrains Mono                         | Durations, counters, tabular data          |
| `--color-background`                 | `bg-background`                        | `#faf8ff` (surface)                    | Page background                            |
| `--color-foreground`                 | `text-foreground`                      | `#131b2e` (on-surface)                 | Default text                               |
| `--color-surface`                    | `bg-surface`                           | `white` (surface-container-lowest)     | Cards and panels                           |
| `--color-surface-muted`              | `bg-surface-muted`                     | `#f2f3ff` (surface-container-low)      | Tiles inside cards, inputs, subtle areas   |
| `--color-surface-strong`             | `bg-surface-strong`                    | `#eaedff` (surface-container)          | Neutral tags, hover on muted tiles         |
| `--color-muted-foreground`           | `text-muted-foreground`                | `#464555` (on-surface-variant)         | Secondary text                             |
| `--color-subtle-foreground`          | `text-subtle-foreground`               | `#64627a` (outline, darkened)          | Labels, metadata, placeholders, icons      |
| `--color-border`                     | `border-border`                        | `#dae2fd` (surface-container-highest)  | Dividers, when a surface shift is not enough |
| `--color-input`                      | `border-input`                         | `#c7c4d8` (outline-variant)            | Form control borders                       |
| `--color-ring`                       | `ring-ring`                            | `#4f46e5`                              | Focus ring                                 |
| `--color-primary`                    | `bg-primary`                           | `#4f46e5` (primary-container)          | Primary buttons, active nav, links         |
| `--color-primary-hover`              | `hover:bg-primary-hover`               | `#3525cd` (primary)                    | Primary hover state                        |
| `--color-primary-foreground`         | `text-primary-foreground`              | `white`                                | Text on `primary`, `success`, `danger`     |
| `--color-primary-subtle`             | `bg-primary-subtle`                    | `#e2dfff` (primary-fixed)              | Soft buttons, AI badges, highlight panels  |
| `--color-primary-subtle-foreground`  | `text-primary-subtle-foreground`       | `#3323cc` (on-primary-fixed-variant)   | Text on `primary-subtle`                   |
| `--color-secondary`                  | `bg-secondary`                         | `#e2e7ff` (surface-container-high)     | Secondary/icon buttons, ghost hover        |
| `--color-secondary-foreground`       | `text-secondary-foreground`            | `#131b2e`                              | Text on `secondary`                        |
| `--color-success`                    | `text-success`                         | `#006c49` (secondary)                  | Match scores, verified states, final step  |
| `--color-success-subtle`             | `bg-success-subtle`                    | `#6cf8bb` (secondary-container)        | Success badge or alert background          |
| `--color-warning`                    | `text-warning`                         | `#885500` (tertiary-container)         | Skill gaps, pending, time-sensitive        |
| `--color-warning-subtle`             | `bg-warning-subtle`                    | `#ffddb8` (tertiary-fixed)             | Warning badge or alert background          |
| `--color-danger`                     | `text-danger`                          | `#ba1a1a` (error)                      | Error text and icons                       |
| `--color-danger-subtle`              | `bg-danger-subtle`                     | `#ffdad6` (error-container)            | Error badge or alert background            |
| `--color-info`                       | `text-info`                            | `sky-700`                              | Informational text and icons               |
| `--color-info-subtle`                | `bg-info-subtle`                       | `sky-50`                               | Informational badge or alert background    |
| `--radius-control`                   | `rounded-control`                      | `radius-lg` (0.5rem)                   | Buttons, inputs, chips                     |
| `--radius-card`                      | `rounded-card`                         | `radius-xl` (0.75rem)                  | Cards, panels, tiles                       |
| `--shadow-card`                      | `shadow-card`                          | `shadow-sm`                            | Card elevation                             |
| `--shadow-card-hover`                | `shadow-card-hover`                    | `shadow-md`                            | Hovered/selected cards, primary buttons    |
| `--shadow-glow`                      | `shadow-glow`                          | indigo glow, 16px                      | AI accents (use sparingly)                 |

Stitch layouts follow a "no-line" rule: separate sections with surface shifts (`bg-background` → `bg-surface` → `bg-surface-muted`) rather than borders. Map Stitch's custom type styles to Tailwind defaults: `body-sm`/`label-*` → `text-xs`, `body-md`/`title-sm` → `text-sm`, `title-md` → `text-base`, `headline-sm` → `text-xl`, `headline-md` → `text-2xl`, `display-hero` → `text-5xl`. Icons use `lucide-react` with `strokeWidth={1.5}`–`1.75`.

## 7. Accessibility

- Interactive elements show a visible focus: `focus-visible:ring-2 focus-visible:ring-ring`.
- Text meets WCAG 2.2 AA contrast (4.5:1).
- Put status text on its `-subtle` background (for example `text-success` on `bg-success-subtle`).
- Keep `<html lang="vi">`.

## 8. Language

- UI copy is in Vietnamese.
- Code, comments, and docs are in English.
