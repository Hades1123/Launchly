# Contributing

## Commit messages

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <JIRA-KEY> <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Use for                                                 |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `chore`    | Maintenance: dependencies, config, tooling              |
| `build`    | Build system or packaging changes                       |
| `perf`     | Performance improvement                                 |
| `style`    | Formatting only, no code change                         |

### Scopes

The scope is optional but recommended. Use the part of the repo that changed:

| Scope    | Path                         |
| -------- | ---------------------------- |
| `api`    | `apps/api`                   |
| `web`    | `apps/web`                   |
| `shared` | `packages/shared`            |
| `db`     | Prisma schema and migrations |
| `deps`   | Dependency updates           |

If a change spans several scopes, omit the scope or pick the most important one.

### Rules

- Start the description with the Jira key of the ticket (project `SCRUM`), e.g. `SCRUM-123`. Jira uses the key to link commits, branches, and PRs to the ticket.
- Use the imperative mood, lowercase, no trailing period: `add login endpoint`, not `Added login endpoint.`
- Keep the first line under 72 characters.
- Use the body to explain _why_, not _what_.
- Mark breaking changes with `!` after the type/scope, or a `BREAKING CHANGE:` footer. Changes to `@launchly/shared` schemas often break both `api` and `web`, so flag them.

### Examples

```
feat(api): SCRUM-12 add login endpoint
fix(web): SCRUM-18 handle empty job list
refactor(api): SCRUM-21 move auth logic into service layer
chore(deps): SCRUM-25 bump prisma to 7.10.1
docs: SCRUM-30 add contributing guide
feat(shared)!: SCRUM-34 rename loginSchema fields

BREAKING CHANGE: `username` is now `email` in loginSchema.
```

## Workflow

1. Create a branch from `main`: `<type>/<JIRA-KEY>-<short-slug>`, e.g. `feat/SCRUM-12-auth-login` or `fix/SCRUM-18-job-list-empty`.
2. Keep commits small and focused; each should leave the project buildable.
3. Before pushing, run:
   ```bash
   pn typecheck
   pn lint
   pn test
   pn test:coverage && pn coverage:changed   # feature tickets: ≥80 % lines and branches on changed files
   pn --filter @launchly/web test:e2e        # any ticket that touches apps/web, whatever its label
   ```
   Which gates apply depends on the Story's label (`feature`, `bug`, `maintenance`); see the table in `AGENTS.md`.
4. Open the pull request into `main` as a **Draft**, titled `[<JIRA-KEY>] <outcome>`, e.g. `[SCRUM-12] Add login endpoint`, and link the Jira ticket in the description. The automated pre-review (code review comment, Playwright e2e) runs on the Draft.
5. When every gate is green, mark the PR ready for review and assign a reviewer on GitHub and in Jira. The `implement-ticket` skill does steps 1–5 for agents.
6. The reviewer runs `review-implementation` in their own session. It reruns the gates and posts one GitHub review (`APPROVE` or `REQUEST_CHANGES`). Only an approved PR is merged, and a person merges it.

See the agent workflow in `AGENTS.md` and `.specify/memory/constitution.md` for the full rules.

## Code style

- Formatting is handled by Prettier (`pn format`); linting by ESLint (`pn lint`).
- Import files within the same app with the `@/` alias, not relative `../` paths.
- Define shared request/response shapes as Zod schemas in `packages/shared`. Do not expose Prisma types to the frontend.

## Cross-platform notes (Linux, macOS, Windows)

- Line endings are always **LF**: `.gitattributes`, `.editorconfig` and Prettier (`endOfLine: "lf"`) enforce it. Do not set `core.autocrlf=true` for this repo.
- Install the **Prettier** and **EditorConfig** extensions in your editor and enable format on save. Otherwise run `pn format` before committing; `pn format:check` only verifies.
- On Windows, run commands in PowerShell or Git Bash. `cp` in the README becomes `copy` in PowerShell. Docker Desktop is required for the local database.

See the [README](README.md) for setup and project conventions.
