# Quickstart: User Authentication and Authorization

## Prerequisites

- Node.js 22 and pnpm 12.
- A PostgreSQL instance reachable using the API's `DATABASE_URL`.
- SMTP or SES credentials for email delivery.
- A Google OAuth client ID for Google sign-in.

## Configure and run

1. Copy the environment example files and set API-only secrets and provider configuration:
   - `apps/api/.env.example` → `apps/api/.env`
   - `apps/web/.env.example` → `apps/web/.env.local`
2. Set `DATABASE_URL`, at least 32-character `JWT_SECRET` and `JWT_REFRESH_SECRET`, `MAIL_DRIVER`, mail sender settings, `GOOGLE_CLIENT_ID`, and the frontend URL used to build verification and reset links. Set `TRUST_PROXY_HOPS` to the exact number of trusted reverse proxies in front of Express; leave it at `0` when the API receives client connections directly.
3. Start PostgreSQL and apply the new migration:

   ```sh
   pn db:up
   pn db:migrate
   ```

4. Start the API and web app:

   ```sh
   pn dev
   ```

5. Browser clients call `/api/auth/*`; the Next.js rewrite forwards these requests to Express. Send the short-lived access token as a bearer token for protected calls. Keep the refresh token in the httpOnly cookie; do not read it from browser JavaScript.

## Validation scenarios

Run the focused schema and API tests:

```sh
pn --filter @launchly/shared test
pn --filter @launchly/api test
pn --filter @launchly/api typecheck
```

Validate these flows with a disposable test email address and configured providers:

1. Register a Candidate, confirm the account is unverified, consume the emailed verification link, then sign in.
2. Sign in with an incorrect password, an unverified account, and a locked account; each request must be denied without a usable session.
3. Sign in, refresh once, then sign out; the old access token and refresh cookie must no longer grant protected access.
4. Request password recovery for registered and unregistered addresses; compare user-facing status and message, then consume a reset link once and verify existing sessions are rejected.
5. Sign in with a Google ID token; verify a new user must choose a role, Gmail/Workspace matches are linked only after provider verification, and other matching addresses require consuming the emailed link before sign-in.
6. Request a role-protected fixture route with no token, an allowed role, and a disallowed role; only the allowed role receives protected content.

See [auth.openapi.yaml](./contracts/auth.openapi.yaml) for request, response, and cookie details and [data-model.md](./data-model.md) for persisted state.
