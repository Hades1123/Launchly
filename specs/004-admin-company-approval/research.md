# Research: Admin Approves or Rejects Companies

No `NEEDS CLARIFICATION` remained in the Technical Context. Decisions below record the choices and their sources.

## R1. Preventing a double decision

- **Decision**: `prisma.company.updateMany({ where: { id, moderationStatus: 'PENDING' }, data })`. `count === 0` → read the company: missing → `AppError('NOT_FOUND')`; otherwise `AppError('CONFLICT', 'Company already <status>', [{ field: 'moderationStatus', ... }])`-style message carrying the current status.
- **Rationale**: one atomic statement; PostgreSQL row locking makes the second concurrent update see the new status and match 0 rows. No transaction or version column needed.
- **Alternatives**: optimistic `version` column (needs a migration and a client round-trip); `SELECT ... FOR UPDATE` in a transaction (more code, same result).
- **Source**: SCRUM-77 D2, SCRUM-27 Technical Notes.

## R2. Sending the email without blocking the decision

- **Decision**: after the update succeeds, call `void mail.send(...).catch((err) => console.error('Moderation email failed', err))`. The response does not wait for it.
- **Rationale**: SCRUM-71 D6 / SCRUM-77 D3. The project logs with `console.error` (`error-handler.ts:32`, `auth.controller.ts:101`); there is no logger module.
- **Alternatives**: awaiting and swallowing (slower response); an outbox table with retries (out of scope, FR-014).
- **Testability**: the service returns before the promise settles; tests flush with `await vi.waitFor(() => expect(mail.send).toHaveBeenCalled())`.

## R3. Mail provider wiring

- **Decision**: `createApp(authService = ..., mail = createMailProvider())` and pass `mail` to `createAdminCompanyService(prisma, mail)`. Tests build the admin router directly with a fake `MailProvider`.
- **Rationale**: `createApp()` already constructs a mail provider for auth (`app.ts:29`), so the env is already required wherever the app starts.

## R4. Email content

- **Decision**: `createModerationEmail({ kind: 'company-approved' | 'company-rejected', companyName, reason? })` returns `{ subject, text, html }` in Vietnamese, plain layout, HTML-escaped values. SCRUM-73 adds job kinds to the same function.
- **Rationale**: same shape as `createAuthEmail` (`auth-email-templates.ts:57`) so `mail.send({ to, ...email })` works; FR-015 limits content to name, outcome, reason.

## R5. Re-registration after rejection

- **Decision**: `create` refuses when `findFirst({ where: { ownerId, moderationStatus: { in: ['PENDING', 'APPROVED'] } } })` finds a row; `getMine` uses `orderBy: { createdAt: 'desc' }`.
- **Rationale**: PO decision (rejected company stays, recruiter registers another). `recruiter-job.service.ts:121` already filters APPROVED companies, so old rejected rows never post jobs.

## R6. Coverage gate

- **Decision**: record `pnpm test:coverage && pnpm coverage:changed` as "n/a: not available" in the PR evidence table.
- **Rationale**: scripts are missing from the root `package.json`; the user chose to follow PRs #21 to #24 instead of halting (2026-11-13).
