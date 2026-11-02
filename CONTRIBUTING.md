# Contributing

## Commit messages

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <description>

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

- Use the imperative mood, lowercase, no trailing period: `add login endpoint`, not `Added login endpoint.`
- Keep the first line under 72 characters.
- Use the body to explain _why_, not _what_.
- Mark breaking changes with `!` after the type/scope, or a `BREAKING CHANGE:` footer. Changes to `@launchly/shared` schemas often break both `api` and `web`, so flag them.

### Examples

```
feat(api): add login endpoint
fix(web): handle empty job list
refactor(api): move auth logic into service layer
chore(deps): bump prisma to 7.10.1
docs: add contributing guide
feat(shared)!: rename loginSchema fields

BREAKING CHANGE: `username` is now `email` in loginSchema.
```

## Workflow

1. Create a branch from `main`: `<type>/<short-description>`, e.g. `feat/auth-login` or `fix/job-list-empty`.
2. Keep commits small and focused; each should leave the project buildable.
3. Before pushing, run:
   ```bash
   pn typecheck
   pn lint
   pn test
   ```
4. Open a pull request into `main`. Use a Conventional Commit style title.

## Code style

- Formatting is handled by Prettier (`pn format`); linting by ESLint (`pn lint`).
- Import files within the same app with the `@/` alias, not relative `../` paths.
- Define shared request/response shapes as Zod schemas in `packages/shared`. Do not expose Prisma types to the frontend.

## Cross-platform notes (Linux, macOS, Windows)

- Line endings are always **LF**: `.gitattributes`, `.editorconfig` and Prettier (`endOfLine: "lf"`) enforce it. Do not set `core.autocrlf=true` for this repo.
- Install the **Prettier** and **EditorConfig** extensions in your editor and enable format on save. Otherwise run `pn format` before committing; `pn format:check` only verifies.
- On Windows, run commands in PowerShell or Git Bash. `cp` in the README becomes `copy` in PowerShell. Docker Desktop is required for the local database.

See the [README](README.md) for setup and project conventions.
