# Quickstart: validate admin company moderation

## Prerequisites

```bash
pn db:up
pn db:migrate        # applies <ts>_moderation_review_audit
pn db:seed           # seeds the ADMIN user, a PENDING company and an APPROVED one
pn dev:api
```

## Automated checks

```bash
pnpm typecheck && pnpm lint && pnpm test
RUN_DB_TESTS=1 pnpm --filter @launchly/api test -- src/modules/admin/admin-company.integration.test.ts
```

Expected: all green; the integration test proves only one of two concurrent approvals applies (E1).

## Manual walk-through (curl against :4000)

1. Log in as the seeded admin; keep the access token.
2. `GET /admin/companies` → the seeded pending company, oldest first.
3. `POST /admin/companies/<id>/reject` with `{"reason":"   "}` → 400.
4. `POST /admin/companies/<id>/reject` with `{"reason":"Missing business licence"}` → 200, `REJECTED`, `reviewedAt` set; the owner's mailbox (local SMTP) gets the rejection email with the reason.
5. Repeat step 4 → 409, status unchanged, no second email.
6. As that recruiter: `GET /companies/me` → `REJECTED` with the reason; `POST /companies` → 201 `PENDING`; `GET /companies/me` → the new company.
7. As admin: approve the new company → 200; `GET /companies/<id>` without a token → 200.
8. As a recruiter: `GET /admin/companies` → 403; without a token → 401.

See [contracts/admin-companies.md](./contracts/admin-companies.md) for shapes.
