# Prisma Cheatsheet

Daily Prisma commands for Launchly (Prisma 7). Run `pn` commands from the repo root. `pn` is the short alias for `pnpm`.

## Where things live

| Path (in `apps/api`) | Purpose |
| --- | --- |
| `prisma/schema.prisma` | Models and enums. The single source of truth. |
| `prisma/migrations/` | Migration history (SQL). **Commit it.** |
| `prisma.config.ts` | CLI config (schema path, `DATABASE_URL`). |
| `src/generated/prisma/` | Generated client. Git-ignored, never edit. |
| `src/lib/prisma.ts` | The `prisma` instance used in code. |

## Setup (after cloning or pulling)

```bash
pn install
pn db:up        # start PostgreSQL (Docker)
pn db:migrate   # apply migrations + generate the client
```

The API does **not** migrate automatically. If you see `table does not exist`, you probably forgot `pn db:migrate`.

## Everyday workflow

1. Edit `apps/api/prisma/schema.prisma`.
2. Create and apply a migration:
   ```bash
   pn --filter @launchly/api exec prisma migrate dev --name add_job_model
   ```
   This writes a SQL file to `migrations/`, runs it on your local DB, and regenerates the client.
3. Use it in code:
   ```ts
   import { prisma } from '@/lib/prisma';

   const jobs = await prisma.job.findMany();
   ```
4. Commit `schema.prisma` and the new `migrations/` folder together:
   ```
   feat(db): add job model
   ```

## Commands

Run from the repo root as `pn --filter @launchly/api exec prisma <command>` (or `cd apps/api` and use `pnpm exec prisma <command>`).

| Command | When to use |
| --- | --- |
| `migrate dev --name <name>` | After editing the schema (development). Creates and applies a migration. |
| `generate` | Regenerate the client only (no DB change). Shortcut: `pn --filter @launchly/api db:generate`. |
| `migrate deploy` | Apply existing migrations without creating new ones. Used for production. |
| `migrate status` | Show which migrations are applied or pending. |
| `migrate reset` | Drop the dev DB and re-apply all migrations. **Deletes all data.** Dev only. |
| `studio` | Open a web UI to browse and edit data. |
| `format` | Format `schema.prisma`. |
| `validate` | Check `schema.prisma` for errors. |
| `db push` | Push the schema to the DB without a migration file. Prototyping only; avoid for real work. |

Shortcuts defined in the root `package.json`:

| Script | Runs |
| --- | --- |
| `pn db:up` / `pn db:down` | Start / stop local PostgreSQL |
| `pn db:migrate` | `prisma migrate dev` |

## Rules

- Never edit a migration that is already committed. Create a new one instead.
- Always commit `schema.prisma` and its migration in the same commit.
- Never run `migrate reset` or `db push` against shared or production databases.
- Never import Prisma types into the frontend. Use Zod schemas and types from `@launchly/shared`.

## Common problems

| Problem | Fix |
| --- | --- |
| `table ... does not exist` | Run `pn db:migrate`. |
| `Cannot find module '@/generated/prisma/client'` | Run `pn --filter @launchly/api db:generate`. |
| Types do not match the schema | Run `generate` again, then restart the TS server in your editor. |
| `Can't reach database server` | Check Docker is running (`pn db:up`) and `DATABASE_URL` uses port `5433`. |
| Migration drift / conflicts after a merge | Pull first, then run `pn db:migrate`. If it is still broken in dev, use `migrate reset`. |
| Local DB is messy and you do not care about the data | `migrate reset`. |

## Prisma 7 notes

- The DB URL is in `prisma.config.ts`, not in `schema.prisma`.
- The client uses a driver adapter (`@prisma/adapter-pg`) created in `src/lib/prisma.ts`.
- The client is generated into `src/generated/prisma`, so import from `@/generated/prisma/client`.
