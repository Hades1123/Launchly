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

Seeded accounts have no password until authentication ships, so they cannot log in yet; `pn db:seed` is idempotent and refuses non-local databases.

`pn dev` runs both apps in one terminal with interleaved logs. For easier debugging, run them separately in two terminals instead:

```bash
pn dev:api   # terminal 1
pn dev:web   # terminal 2
```

Both are needed for the full app: the home page calls the API's `/health` endpoint. Start order does not matter.

- Web: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`)

The web app proxies `/api/*` to the API through Next.js rewrites, so the browser never makes cross-origin requests in development.

## Run the API in Docker

Instead of the host toolchain, you can build and run the API in a container. This needs only Docker; no local Node or pnpm. Run from the repository root.

```bash
# Start Postgres, apply migrations (one-off container), then start the API
docker compose --profile app up -d --build

# Load the demo seed into the containerized database (idempotent, rerun anytime)
docker compose --profile seed run --rm seed
```

- The `migrate` service runs `prisma migrate deploy` and exits; the `api` service starts only after it succeeds, so the API never migrates itself.
- The `api` container publishes port **4000**, the same port as `pn dev:api`. Stop the host API first, or they conflict.
- The `JWT_SECRET` / `JWT_REFRESH_SECRET` values in `docker-compose.yml` are local placeholders for development only. They are never real secrets.

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
| `pn db:up` / `pn db:down`   | Start / stop local PostgreSQL (`db:down` removes all project containers) |
| `pn db:migrate`             | Create and apply a Prisma migration                       |
| `pn db:seed`                | Load idempotent demo data into a local database           |

Containerized API (run from the repo root, Docker only):

| Command                                          | Description                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `docker compose --profile app up -d --build`     | Apply migrations, then start the API in a container on port 4000    |
| `docker compose --profile seed run --rm seed`    | Load the demo seed into the containerized database (idempotent)     |

Run a script in a single package with `pn --filter @launchly/api <script>`.

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
