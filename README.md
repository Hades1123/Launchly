# Launchly

A recruitment platform built as a pnpm monorepo: a Next.js frontend, an Express REST API, and a PostgreSQL database. Types and validation schemas are shared between frontend and backend.

See [`docs/Launchly-Tech-Stack-Architecture-v1.md`](docs/Launchly-Tech-Stack-Architecture-v1.md) for the architecture and [`docs/Launchly-Project-Setup-Plan.md`](docs/Launchly-Project-Setup-Plan.md) for the setup decisions.

## Tech stack

| Area     | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend  | Express 5, Node.js 22, TypeScript                 |
| Database | PostgreSQL 17, Prisma 7                           |
| Shared   | Zod 4 schemas and inferred types                  |
| Tooling  | pnpm 12 workspaces, Vitest, ESLint, Prettier      |

## Repository layout

```
.
├─ apps/
│  ├─ api/               # Express API + Prisma (port 4000)
│  │  ├─ prisma/         # schema.prisma and migrations
│  │  └─ src/
│  │     ├─ lib/         # env validation, Prisma client
│  │     ├─ middlewares/ # error handler, validate, not-found (auth to come)
│  │     ├─ modules/     # feature modules: routes, controller, service
│  │     └─ providers/   # swappable storage / mail implementations
│  └─ web/               # Next.js app (port 3000)
├─ packages/
│  └─ shared/            # @launchly/shared: Zod schemas and types
├─ docker-compose.yml    # local PostgreSQL
└─ docs/
```

## Prerequisites

- Node.js 22 (see `.nvmrc`). Version managers: `nvm` / `fnm` on Linux and macOS, `nvm-windows` or `fnm` on Windows.
- pnpm 12. Install with `corepack enable` (it picks the version from `package.json`) or `npm install -g pnpm@12`. On Windows, `corepack enable` may need an administrator terminal.
- Docker for the local database: Docker Desktop on macOS and Windows (on Windows, use the WSL 2 backend), Docker Engine on Linux.
- Git. On Windows, run all commands in PowerShell or Git Bash.

## Getting started

```bash
# 1. Install dependencies
pn install

# 2. Create env files (Linux / macOS / Git Bash)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start PostgreSQL (host port 5433). Docker must be running.
pn db:up

# 4. Create the database tables
pn db:migrate

# 5. Load demo data (idempotent, local-only; rerun anytime)
pn db:seed

# 6. Start the API and the web app
pn dev
```

On Windows PowerShell, step 2 is:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

`pn db:seed` is idempotent (rerunning it restores the demo rows) and refuses non-local databases. It also writes the demo CV PDFs to `apps/api/uploads/`. Every seeded account uses the password `Launchly@123`:

| Email                                | Role      | Demo state                                          |
| ------------------------------------ | --------- | --------------------------------------------------- |
| `admin@launchly.test`                | Admin     | Owns the interview question bank                    |
| `recruiter@launchly.test`            | Recruiter | Nimbus Labs (approved); has draft and rejected jobs |
| `recruiter.fpt@launchly.test`        | Recruiter | FPT Digital (approved); has pending and closed jobs |
| `recruiter.lotus@launchly.test`      | Recruiter | Lotus Finance (approved)                            |
| `recruiter.pending@launchly.test`    | Recruiter | Draft Ventures (pending approval)                   |
| `recruiter.rejected@launchly.test`   | Recruiter | QuickCash Jobs (rejected, with a reason)            |
| `candidate1@launchly.test`           | Candidate | Frontend profile, CV, 2 applications                |
| `candidate2@launchly.test`           | Candidate | Backend profile, CV, 3 applications                 |
| `candidate.locked@launchly.test`     | Candidate | Locked: login returns `ACCOUNT_LOCKED`              |
| `candidate.unverified@launchly.test` | Candidate | Unverified: login returns `EMAIL_NOT_VERIFIED`      |

Public search shows 11 published jobs (two pages); "Thực tập sinh Frontend React" has a hidden salary.

`pn dev` runs both apps in one terminal with interleaved logs. For easier debugging, run them separately in two terminals instead:

```bash
pn dev:api   # terminal 1
pn dev:web   # terminal 2
```

Both are needed for the full app: the home page calls the API's `/health` endpoint. Start order does not matter.

- Web: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`)

The web app proxies `/api/*` to the API through Next.js rewrites, so the browser never makes cross-origin requests in development.

## Scripts

Run from the repository root. `pn` is the short alias for `pnpm` (available since pnpm 11); `pnpm` works the same.

| Command                     | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| `pn dev`                    | Run the API and web app together in one terminal          |
| `pn dev:api` / `pn dev:web` | Run only the API or only the web app (separate terminals) |
| `pn build`                  | Build all packages                                        |
| `pn typecheck`              | Type-check all packages                                   |
| `pn lint`                   | Lint the whole repo                                       |
| `pn test`                   | Run tests (Vitest) in all packages                        |
| `pn format`                 | Format with Prettier                                      |
| `pn db:up` / `pn db:down`   | Start / stop local PostgreSQL                             |
| `pn db:migrate`             | Create and apply a Prisma migration                       |
| `pn db:sync`                | Apply committed migrations and regenerate the client      |
| `pn db:deploy`              | Apply committed migrations only (no new migration)        |
| `pn db:generate`            | Regenerate the Prisma client                              |
| `pn db:reset`               | Wipe the local database, migrate and seed (local only)    |
| `pn db:seed`                | Load idempotent demo data into a local database           |

Run a script in a single package with `pn --filter @launchly/api <script>`.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request (opened, new commits, reopened). Two jobs, each with its own PostgreSQL service:

- **gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `prisma migrate deploy`, a schema-drift check and the database-backed tests (`RUN_DB_TESTS=1`).
- **e2e:** migrate, seed and `pnpm --filter @launchly/web test:e2e` (Chromium). The Playwright report is uploaded as an artifact when it fails.

It uses `AI_DRIVER=mock`, so no secret is needed. The live Gemini check (`ai:smoke`) stays a manual step. The changed-file coverage gate does not exist yet, so CI does not run it.

## Running e2e tests locally

End-to-end tests use Playwright (Chromium) against the local stack.

```bash
pn db:up && pn db:migrate && pn db:seed   # database up, migrated, demo data loaded
pnpm --filter @launchly/web exec playwright install chromium   # once per machine
pn --filter @launchly/web test:e2e        # starts the API (:4100) and web app (:3100) itself
```

The tests start their own API and web app on ports 4100 and 3100 (never your dev servers on 3000 and 4000), so stop anything that uses those ports first. Specs live in `apps/web/e2e/`. All seeded accounts use the demo password from `apps/api/prisma/seed/data.ts`.

## Enabling the AI provider

Business code calls the `AiProvider` interface (`apps/api/src/providers/ai/`); `AI_DRIVER` picks the implementation. `mock` (default) needs no key and is what tests and CI use.

To use the real model (Gemini):

1. Create a key in Google AI Studio.
2. In `apps/api/.env` set `AI_DRIVER=gemini`, `GEMINI_API_KEY=<key>` and, if needed, `AI_MODEL` (default `gemini-3.5-flash-lite`; the 2.5 models return 404). Never commit the key.
3. Check it with a live call: `pnpm --filter @launchly/api ai:smoke`. It must print three `PASS` lines. A `503` can be a short Google overload, so rerun once before suspecting the setup.
4. Restart the API. A missing key with `AI_DRIVER=gemini` stops the API at startup.

CV text is sent to Google when the Gemini driver is on.

To add another vendor: implement `AiProvider` in a new `<vendor>-ai.provider.ts`, add its value to `AI_DRIVER` in `lib/env.ts` and to `createAiProvider` in `providers/ai/index.ts`, and cover it with a test that injects `fetch`.

## Conventions

### Shared package

`@launchly/shared` is consumed as TypeScript source (no build step). Both apps import it directly:

```ts
import { loginSchema, type LoginInput } from '@launchly/shared';
```

Define request/response shapes as Zod schemas in `packages/shared/src/schemas/` and export the inferred types. The API validates requests with the schema and the web app validates forms with the same one. Do not expose Prisma types to the frontend; map them to shared DTOs instead.

### Path alias

Inside `apps/api` and `apps/web`, import files from the same app with `@/` (maps to `src/`), not with relative `../` paths:

```ts
import { env } from '@/lib/env';
```

### Authentication

JWT access token plus a refresh token stored in an httpOnly cookie.

### Environment variables

Env vars are validated with Zod on API startup (`apps/api/src/lib/env.ts`); the API fails fast if one is missing. Commit only `.env.example` files, never real secrets.

### Database

- Edit `apps/api/prisma/schema.prisma`, then run `pn db:migrate`.
- The Prisma client is generated into `apps/api/src/generated/` (git-ignored) and regenerated by `pn --filter @launchly/api db:generate`.
- Daily Prisma commands for the team: [`docs/Prisma-Cheatsheet.md`](docs/Prisma-Cheatsheet.md).
- If port 5433 is taken, change the host port in `docker-compose.yml` and `DATABASE_URL`.
- Recruitment applications are unique per candidate and job, with lifecycle changes stored in `ApplicationStatusHistory`. AI assessments and interview scores are bounded advisory data only; they do not automatically change an application status.

## Notes

- TypeScript is pinned to 6.0.x because `typescript-eslint` does not yet support 7.x.
- pnpm 12 blocks dependency build scripts by default; the allowed ones (`prisma`, `@prisma/engines`, `esbuild`) are listed under `allowBuilds` in `pnpm-workspace.yaml`.

## Contributing

Commit messages follow Conventional Commits. See [CONTRIBUTING.md](CONTRIBUTING.md) for the commit format, branch naming and workflow.
