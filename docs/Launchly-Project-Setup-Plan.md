# Launchly – Project Setup Plan (pnpm monorepo)

> Status: **implemented**. This document records the setup decisions and the reasoning behind them.
> Package versions were checked with `npm view` on 2026-11-02.
> Environment: Node v22.23.1, pnpm 12.6.0, Docker 29.9.2.

## 1. Review of the architecture document

**Strengths**
- A single TypeScript stack (Next.js + Express + Prisma) is a good fit for sharing types in a monorepo.
- A modular monolith with route → controller → service → data-access layers is simple and suits a small team with limited time.
- Abstracting file storage and email (dev vs. deploy is only a config change) is the right call.
- Secrets live only in the backend.

**Points to clarify or change**
1. **Sharing plain TS types is not enough.** Share **Zod schemas** and derive types with `z.infer`. One schema then serves request validation in Express, form validation in Next.js, and type generation, so types cannot be right at compile time and wrong at runtime.
2. **Do not share the Prisma Client with the frontend.** Prisma types mirror the database (e.g. `passwordHash`, `Date` instead of ISO strings). The frontend should use DTOs / Zod schemas from `packages/shared`; the backend maps Prisma models to DTOs.
3. **The auth token strategy was unspecified.** Decision: short-lived JWT access token plus a refresh token in an **httpOnly cookie**. Next.js SSR can read the cookie to render per-user pages.
4. **Next.js SSR + a separate Express app means two servers and two origins.** Dev: Next on `:3000`, API on `:4000`. Decision: use Next.js **rewrites** to proxy `/api/*` to Express, which avoids CORS and cross-site cookie issues.
5. **Missing from the document:** validation, a consistent error format, logging, migrations, seeding, tests, and role-based authorization (candidate / recruiter / admin).
6. **Gemini:** force JSON output with a response schema and re-validate with Zod before storing (the model can return malformed output). Add rate limits and timeouts to AI endpoints.
7. **File uploads:** check the MIME type via magic bytes (not just the extension), limit size, use random (UUID) file names, and never serve the upload folder directly.
8. The document references "Figure 1" (`![][image1]`), but the image is not included in the `.md` file.

## 2. Monorepo structure

```
launchly/
├─ apps/
│  ├─ web/                 # Next.js (App Router) + Tailwind
│  └─ api/                 # Express + Prisma
├─ packages/
│  └─ shared/              # Zod schemas, DTO types, enums (used by web and api)
├─ docker-compose.yml      # PostgreSQL for development
├─ pnpm-workspace.yaml
├─ package.json            # root scripts and shared devDependencies
├─ tsconfig.base.json
└─ docs/
```

`apps/api` follows the layers from the architecture document, split into modules by business function:

```
apps/api/src/
├─ modules/        # auth, users, jobs, applications, ai
│                  # (each: routes, controller, service)
├─ middlewares/    # auth, role guard, validate, error handler
├─ lib/            # prisma client, env validation, logger
├─ providers/      # storage/{local,s3}, mail/{smtp,ses}
├─ app.ts
└─ server.ts
prisma/schema.prisma
```

## 3. Versions

| Component | Version | Notes |
|---|---|---|
| Node.js | **22 LTS** | Satisfies Next 16 (`>=20.9`) and Prisma. Recorded in `.nvmrc` and `engines`. |
| pnpm | **12.x** | Pinned through `packageManager` in the root `package.json`. |
| TypeScript | **6.0.3** (not 7.x) | TS 7.0.2 is the newest, but `typescript-eslint` only supports `<6.1.0`, so we pin `~6.0.3`. |
| Next.js | **16.4.x** | App Router. |
| React / React DOM | **19.3.x** | |
| Tailwind CSS | **4.3.x** | Via `@tailwindcss/postcss`; configured in CSS. |
| Express | **5.3.x** | Async handler errors are forwarded to the error middleware automatically. |
| Prisma (`prisma`, `@prisma/client`) | **7.10.1** | npm `latest` is currently `8.0.0-rc` (not stable), so we pin 7.10.1. Prisma 7 uses driver adapters: `@prisma/adapter-pg` + `pg`. |
| PostgreSQL | **17** | `postgres:17` via Docker Compose. |
| Zod | **4.6.x** | Shared schemas. |
| tsx / tsup | latest | Run the API in dev / build it for production. |
| Vitest | **5.0.x** | Tests for backend, frontend and shared (instead of Jest: native TS/ESM, one tool). |
| ESLint | **10.x** + `typescript-eslint` 8.72 | Flat config at the root. |
| Prettier | latest | |
| Later, as needed | | Multer 2 (uploads), Nodemailer 10, jsonwebtoken 9, google-auth-library 11, @google/genai 2, AWS SDK v3 (S3/SES at deploy time), pino, express-rate-limit. |

Turborepo is **not** used for now: `pnpm -r` / `pnpm --filter` is enough for three packages. It can be added later if builds get slow.

## 4. Key configuration

### 4.1 Sharing types: `packages/shared` (just-in-time, no build step)

- Package name `@launchly/shared`; both apps depend on it with `workspace:*`.
- `exports` points straight at the TypeScript source:
  ```json
  { "exports": { ".": "./src/index.ts" } }
  ```
- Next.js: `transpilePackages: ["@launchly/shared"]` in `next.config.ts`.
- API: `tsx` runs the TS source in dev; `tsup` bundles it in production (`noExternal: ["@launchly/shared"]`).
- Editing a schema is reflected in both apps immediately, with no build or watch process for `shared`.
- Contents: Zod schemas, types inferred with `z.infer`, enums, error codes, response wrappers.

### 4.2 Path alias

`@/*` maps to `src/*` in both `apps/api` and `apps/web`. Imports within the same app use `@/...` instead of relative `../` paths.

### 4.3 Database

- `docker-compose.yml` runs `postgres:17` on host port **5433** (5432 was already in use on the dev machine).
- Prisma 7: the datasource URL lives in `prisma.config.ts`; the client is generated to `apps/api/src/generated/` (git-ignored).
- Development uses `prisma migrate dev`; production uses `prisma migrate deploy`. The `migrations/` folder is committed.

### 4.4 Environment variables

- `apps/api/.env`: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `STORAGE_DRIVER=local|s3`, `MAIL_DRIVER=smtp|ses`, and later Google OAuth, Gemini and SMTP settings.
- `apps/web/.env.local`: `API_URL` (target of the rewrite proxy).
- Env vars are validated with Zod at startup (`lib/env.ts`) so the API fails fast. `.env.example` files are committed; `.env` files are not.

### 4.5 Code quality

- ESLint flat config and Prettier at the root.
- Tests: Vitest (add `supertest` for API tests), written once features exist.
- No CI for now.
- Commit messages follow Conventional Commits (see `CONTRIBUTING.md`).

## 5. Decisions

| Topic | Decision |
|---|---|
| Auth tokens | JWT access token + refresh token in an httpOnly cookie |
| Frontend → API | Next.js rewrites proxy (no CORS in dev) |
| Sharing code | Just-in-time source package, no build step |
| TypeScript | Pinned to 6.0.x |
| Prisma | 7.10.1 (stable), not 8 RC |
| Test runner | Vitest everywhere |
| CI | None |
| Turborepo | Not used for now |
| Package scope | `@launchly/*` |
| Path alias | `@/` in each app |

## 6. Next steps

1. API infrastructure: `validate(schema)` middleware, a consistent error type, logger (pino), rate limiting.
2. Authentication: register/login, JWT cookies, then Google OAuth.
3. Role-based authorization (candidate / recruiter / admin).
4. Feature modules: jobs → applications.
5. File upload (local and S3 providers).
6. Gemini integration.
7. Email (SMTP and SES providers).
