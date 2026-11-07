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
- The type scale, spacing, and breakpoints are Tailwind defaults.
- Class order is handled by `prettier-plugin-tailwindcss`; run `pn format`.

Self-check, which must print nothing:

```bash
grep -rnE '\b(bg|text|border|ring|from|to|via|fill|stroke|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b|-\[(#|[0-9]|rgb|hsl|oklch)' apps/web/src --include='*.tsx' --include='*.ts'
```

## 6. Token table

| CSS variable                    | Example utility                     | Palette value | Intended use                              |
| ------------------------------- | ----------------------------------- | ------------- | ----------------------------------------- |
| `--font-sans`                   | `font-sans`                         | Inter         | Default font (latin and Vietnamese)       |
| `--color-background`            | `bg-background`                     | `white`       | Page background                           |
| `--color-foreground`            | `text-foreground`                   | `slate-900`   | Default text                              |
| `--color-surface`               | `bg-surface`                        | `white`       | Cards and panels                          |
| `--color-surface-muted`         | `bg-surface-muted`                  | `slate-50`    | Subtle sections, table stripes            |
| `--color-muted-foreground`      | `text-muted-foreground`             | `slate-600`   | Secondary text                            |
| `--color-border`                | `border-border`                     | `slate-200`   | Dividers and card borders                 |
| `--color-input`                 | `border-input`                      | `slate-300`   | Form control borders                      |
| `--color-ring`                  | `ring-ring`                         | `indigo-500`  | Focus ring                                |
| `--color-primary`               | `bg-primary`                        | `indigo-600`  | Primary buttons and links                 |
| `--color-primary-hover`         | `hover:bg-primary-hover`            | `indigo-700`  | Primary hover state                       |
| `--color-primary-foreground`    | `text-primary-foreground`           | `white`       | Text on `primary`                         |
| `--color-secondary`             | `bg-secondary`                      | `slate-100`   | Secondary buttons                         |
| `--color-secondary-foreground`  | `text-secondary-foreground`         | `slate-900`   | Text on `secondary`                       |
| `--color-success`               | `text-success`                      | `emerald-700` | Success text and icons                    |
| `--color-success-subtle`        | `bg-success-subtle`                 | `emerald-50`  | Success badge or alert background         |
| `--color-warning`               | `text-warning`                      | `amber-700`   | Warning text and icons                    |
| `--color-warning-subtle`        | `bg-warning-subtle`                 | `amber-50`    | Warning badge or alert background         |
| `--color-danger`                | `text-danger`                       | `red-700`     | Error text and icons                      |
| `--color-danger-subtle`         | `bg-danger-subtle`                  | `red-50`      | Error badge or alert background           |
| `--color-info`                  | `text-info`                         | `sky-700`     | Informational text and icons              |
| `--color-info-subtle`           | `bg-info-subtle`                    | `sky-50`      | Informational badge or alert background   |
| `--radius-control`              | `rounded-control`                   | `radius-md`   | Buttons and inputs                        |
| `--radius-card`                 | `rounded-card`                      | `radius-xl`   | Cards and panels                          |
| `--shadow-card`                 | `shadow-card`                       | `shadow-sm`   | Card elevation                            |

## 7. Accessibility

- Interactive elements show a visible focus: `focus-visible:ring-2 focus-visible:ring-ring`.
- Text meets WCAG 2.2 AA contrast (4.5:1).
- Put status text on its `-subtle` background (for example `text-success` on `bg-success-subtle`).
- Keep `<html lang="vi">`.

## 8. Language

- UI copy is in Vietnamese.
- Code, comments, and docs are in English.
