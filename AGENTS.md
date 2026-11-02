# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, etc.) when working with code in this repository.

Launchly is a recruitment platform: a pnpm monorepo with a Next.js frontend (`apps/web`), an Express 5 REST API (`apps/api`) and shared Zod schemas (`packages/shared`), on PostgreSQL via Prisma 7. Architecture rationale is in `docs/Launchly-Tech-Stack-Architecture-v1.md`; setup decisions in `docs/Launchly-Project-Setup-Plan.md`. Write all docs in English.

## Commands

Use `pn` (alias of `pnpm`) from the repo root.

```bash
pn db:up                 # start PostgreSQL (Docker, host port 5433)
pn db:migrate            # prisma migrate dev (apply migrations + generate client)
pn dev                   # API :4000 + web :3000 together
pn dev:api / pn dev:web  # run one app (separate terminals, easier debugging)
pn typecheck             # tsc in every package
pn lint                  # eslint . (flat config at root)
pn test                  # vitest in every package (--if-present)
pn --filter @launchly/api test -- path/to/file.test.ts   # single test file
pn --filter @launchly/api exec prisma <cmd>              # any Prisma CLI command
```

No tests exist yet. There is no CI. Prisma command reference: `docs/Prisma-Cheatsheet.md`.

## Architecture

- **Shared package is source-only.** `@launchly/shared` exports `./src/index.ts` directly (no build step). Next.js consumes it via `transpilePackages`; the API runs it through `tsx` in dev and bundles it with `tsup` (`noExternal`) for production. Define request/response shapes as Zod schemas there and export `z.infer` types; the API validates with them and the web app reuses them. Never expose Prisma types to the frontend; map to shared DTOs.
- **Web → API goes through a Next.js rewrite.** `apps/web/next.config.ts` proxies `/api/:path*` to `${API_URL}/:path*` (default `http://localhost:4000`), so the API route `/health` is `/api/health` from the browser. Server components can call `API_URL` directly.
- **API layering** (route → controller → service → Prisma), organised in `apps/api/src/modules/<feature>/`. Cross-cutting code is in `middlewares/` (error handler) and `lib/` (`env.ts` Zod-validated env that fails fast, `prisma.ts`). `providers/` is reserved for swappable implementations (storage: local/S3, mail: SMTP/SES) selected by `STORAGE_DRIVER` / `MAIL_DRIVER`; business code must depend on the abstraction, not the vendor.
- **Prisma 7 specifics.** Datasource URL lives in `apps/api/prisma.config.ts`, not in `schema.prisma`. The client is generated into `apps/api/src/generated/prisma` (git-ignored; run `db:generate` after cloning) and needs a driver adapter: `PrismaPg` in `lib/prisma.ts`. Import it from `@/generated/prisma/client`.
- **Auth design (not yet implemented):** short-lived JWT access token plus refresh token in an httpOnly cookie; Google OAuth verified on the backend. Roles: `CANDIDATE`, `RECRUITER`, `ADMIN`.

## Conventions and gotchas

- Inside `apps/api` and `apps/web`, import same-app files with the `@/` alias (maps to `src/`), not `../` paths.
- Commits follow Conventional Commits with scopes `api`, `web`, `shared`, `db`, `deps` (see `CONTRIBUTING.md`).
- TypeScript is pinned to `~6.0.3` because `typescript-eslint` does not support 7.x. Prisma is pinned to 7.10.1 (npm `latest` is an 8 RC).
- pnpm 12 blocks dependency build scripts; allowed packages are listed under `allowBuilds` in `pnpm-workspace.yaml` (`prisma`, `@prisma/engines`, `esbuild`). Add new ones there if an install reports `ERR_PNPM_IGNORED_BUILDS`.
- Postgres is mapped to host port **5433** (5432 conflicted); `DATABASE_URL` in `apps/api/.env` must match. Env files are created by copying each `.env.example`.
- The API does not migrate on startup. Never edit committed migrations; never run `migrate reset` or `db push` against shared databases.
