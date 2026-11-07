# Frontend Conventions

Rules for `apps/web`. Design tokens live in one place: `apps/web/src/app/globals.css`.

## 1. Layout of `apps/web/src`

Target structure. Create folders only when a ticket needs them.

- `app/`: routes, layouts, and `globals.css`.
- `components/ui/`: generic primitives (button, input, badge).
- `components/<feature>/`: feature-specific components.
- `lib/`: helpers and API client code.

## 2. Naming

- File names use kebab-case (`job-card.tsx`).
- Component exports use PascalCase (`JobCard`).
- Import same-app files with the `@/` alias (maps to `src/`), not `../` paths.

## 3. Components

- Components are Server Components by default.
- Add `'use client'` only for interactivity (state, effects, event handlers).

## 4. Contracts

Forms and API responses reuse the Zod schemas from `@launchly/shared` (constitution Principle I). Do not hand-write duplicate types, and never import Prisma types in the frontend.

## 5. Token rules

- Style with semantic utilities only (`bg-primary`, `text-muted-foreground`, `rounded-card`).
- Never use raw palette classes (`bg-indigo-600`) or arbitrary values (`bg-[#4f46e5]`, `text-[13px]`) in components.
- Add or rename a token only in `globals.css` and in the table below, in the same PR.
- Spacing and breakpoints are Tailwind defaults; text sizes use only the named tokens (`text-headline-md`, `text-body-md`, ...), never `text-sm`, `text-2xl`, and so on.
- Pair `font-display` with display, headline, and title sizes.
- Pair `font-mono` with `text-code-data` (set it explicitly; do not rely on the default `code` styling).
- Make headings responsive with prefixes, for example `text-headline-md md:text-headline-lg`.
- Prefer tonal surfaces (`bg-surface` on `bg-background`, `bg-surface-muted`, `bg-secondary`) and `shadow-card` over borders; use `border-border` only for decorative dividers.
- Use `max-w-page` for the page container and `shadow-header` for sticky header and footer chrome.
- Class order is handled by `prettier-plugin-tailwindcss`; run `pn format`.

Spacing maps onto Tailwind steps (the Stitch scale equals Tailwind spacing): `space-2xs`=0.5, `xs`=1, `sm`=2, `md`=4, `lg`=6, `xl`=8, `2xl`=12, `3xl`=16, `gutter`=6, `margin`=8 desktop / 4 mobile.

Translating Stitch classes to Launchly tokens:

- `bg-surface-container-lowest` → `bg-surface`;
- `bg-surface-container-low` → `bg-surface-muted`;
- `bg-surface-container-high` → `bg-secondary`;
- `hover:bg-primary-container` → `hover:bg-primary-hover`;
- `bg-primary-fixed text-on-primary-fixed-variant` → `bg-primary-subtle text-primary`;
- `bg-secondary-container text-on-secondary-container` → `bg-success-subtle text-success`;
- `bg-tertiary-fixed text-tertiary` → `bg-warning-subtle text-warning`;
- `text-on-surface-variant` and `text-outline` → `text-muted-foreground`.

Self-check, which must print nothing:

```bash
grep -rnE '\b(bg|text|border|ring|from|to|via|fill|stroke|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b|-\[(#|[0-9]|rgb|hsl|oklch)|\btext-(xs|sm|base|lg|[2-9]?xl)\b' apps/web/src --include='*.tsx' --include='*.ts'
```

## 6. Token table

Colours, fonts, shape, and layout. Values are the literal Stitch design values (the Stitch Material-3 role is named in parentheses); `info` has no Stitch role and keeps the Tailwind `sky` palette.

| CSS variable                    | Example utility                     | Value (Stitch role)                   | Intended use                              |
| ------------------------------- | ----------------------------------- | ------------------------------------- | ----------------------------------------- |
| `--font-sans`                   | `font-sans`                         | Inter                                 | Default body and label font (latin, vi)   |
| `--font-display`                | `font-display`                      | Plus Jakarta Sans                     | Display, headline, and title text         |
| `--font-mono`                   | `font-mono`                         | JetBrains Mono                        | Code-data (scores, salaries, IDs)         |
| `--color-background`            | `bg-background`                     | `#faf8ff` (background)                 | Page background                           |
| `--color-foreground`            | `text-foreground`                   | `#131b2e` (on-surface)                | Default text                              |
| `--color-surface`               | `bg-surface`                        | `#ffffff` (surface-container-lowest)  | Cards and panels                          |
| `--color-surface-muted`         | `bg-surface-muted`                  | `#f2f3ff` (surface-container-low)     | Subtle sections, table stripes            |
| `--color-muted-foreground`      | `text-muted-foreground`             | `#464555` (on-surface-variant)        | Secondary text and placeholders           |
| `--color-border`                | `border-border`                     | `#c7c4d8` (outline-variant)           | Decorative dividers only                  |
| `--color-input`                 | `border-input`                      | `#777587` (outline)                   | Control boundaries, never text            |
| `--color-ring`                  | `ring-ring`                         | `#4f46e5` (primary-container)         | Focus ring                                |
| `--color-primary`               | `bg-primary`                        | `#3525cd` (primary)                   | Primary buttons and links                 |
| `--color-primary-hover`         | `hover:bg-primary-hover`            | `#4f46e5` (primary-container)         | Primary hover state                       |
| `--color-primary-foreground`    | `text-primary-foreground`           | `#ffffff` (on-primary)                | Text on `primary`                         |
| `--color-primary-subtle`        | `bg-primary-subtle`                 | `#e2dfff` (primary-fixed)             | Brand/AI chips, selected nav              |
| `--color-secondary`             | `bg-secondary`                      | `#e2e7ff` (surface-container-high)    | Tonal buttons                             |
| `--color-secondary-hover`       | `hover:bg-secondary-hover`          | `#dae2fd` (surface-container-highest) | Tonal button hover                        |
| `--color-secondary-foreground`  | `text-secondary-foreground`         | `#131b2e` (on-surface)                | Text on `secondary`                       |
| `--color-success`               | `text-success`                      | `#006c49` (secondary)                 | Success text and icons                    |
| `--color-success-subtle`        | `bg-success-subtle`                 | `#6cf8bb` (secondary-container)       | Success badge or alert background         |
| `--color-warning`               | `text-warning`                      | `#684000` (tertiary)                  | Warning text and icons                    |
| `--color-warning-subtle`        | `bg-warning-subtle`                 | `#ffddb8` (tertiary-fixed)            | Warning badge or alert background         |
| `--color-danger`                | `text-danger`                       | `#ba1a1a` (error)                     | Error text and icons                      |
| `--color-danger-subtle`         | `bg-danger-subtle`                  | `#ffdad6` (error-container)           | Error badge or alert background           |
| `--color-info`                  | `text-info`                         | `sky-700` (no Stitch role)            | Informational text and icons              |
| `--color-info-subtle`           | `bg-info-subtle`                    | `sky-50` (no Stitch role)             | Informational badge or alert background   |
| `--radius-control`              | `rounded-control`                   | `radius-lg`                           | Buttons and inputs                        |
| `--radius-card`                 | `rounded-card`                      | `radius-xl`                           | Cards and panels                          |
| `--shadow-card`                 | `shadow-card`                       | `shadow-sm`                           | Card elevation                            |
| `--shadow-header`               | `shadow-header`                     | `0 1px 8px rgb(0 0 0 / 0.04)`         | Sticky header and footer chrome           |
| `--container-page`              | `max-w-page`                        | `90rem` (1440px)                      | Page container max width                  |

Typography. Each `text-*` token sets size, line height, weight, and (where Stitch defines one) letter spacing, but not the font family: pair it with `font-display`, `font-sans`, or `font-mono`.

| Utility              | Size / line height   | Weight | Letter spacing | Pair with      | Use                               |
| -------------------- | -------------------- | ------ | -------------- | -------------- | --------------------------------- |
| `text-display-hero`  | 3rem / 3.5rem        | 700    | -0.025em       | `font-display` | Landing hero                      |
| `text-headline-lg`   | 2rem / 2.5rem        | 600    | -0.02em        | `font-display` | Page title, desktop               |
| `text-headline-md`   | 1.5rem / 2rem        | 600    | -0.015em       | `font-display` | Page title, mobile; section title |
| `text-headline-sm`   | 1.25rem / 1.75rem    | 600    | -0.01em        | `font-display` | Card group title                  |
| `text-title-md`      | 1rem / 1.5rem        | 600    | —              | `font-display` | Card title                        |
| `text-title-sm`      | 0.875rem / 1.25rem   | 600    | —              | `font-display` | Small card title, table header    |
| `text-body-lg`       | 1rem / 1.625rem      | 400    | —              | `font-sans`    | Lead paragraph                    |
| `text-body-md`       | 0.875rem / 1.375rem  | 400    | —              | `font-sans`    | Default body text                 |
| `text-body-sm`       | 0.75rem / 1.125rem   | 400    | —              | `font-sans`    | Helper text, metadata             |
| `text-label-md`      | 0.8125rem / 1.125rem | 500    | 0.01em         | `font-sans`    | Buttons, form labels, badges      |
| `text-label-sm`      | 0.6875rem / 1rem     | 600    | 0.04em         | `font-sans`    | Chips, overlines                  |
| `text-code-data`     | 0.75rem / 1rem       | 500    | —              | `font-mono`    | Scores, salaries, IDs             |

## 7. Accessibility

- Interactive elements show a visible focus: `focus-visible:ring-2 focus-visible:ring-ring`.
- Text meets WCAG 2.2 AA contrast (4.5:1).
- Non-text contrast: `border-input` and `ring-ring` are ≥ 3:1.
- `border` is decorative only; it is not held to a contrast threshold.
- Never render text in the `input` colour. Placeholders use `placeholder:text-muted-foreground`.
- Put status text on its `-subtle` background (for example `text-success` on `bg-success-subtle`).
- Deliberate deviations from Stitch: no outline suppression, no translucent focus shadow, and no `text-outline` (its #777587 is 4.26:1 on `background`, below AA; use `text-muted-foreground`).
- Keep `<html lang="vi">`.

## 8. Language

- UI copy is in Vietnamese.
- Code, comments, and docs are in English.
