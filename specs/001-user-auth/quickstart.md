# Quickstart: User Authentication and Authorization

## Prerequisites

- Node.js 22 and pnpm 12.
- A PostgreSQL instance reachable using the API's `DATABASE_URL`.
- SMTP or SES credentials for email delivery.
- A Google OAuth client ID for Google sign-in.

## Email setup and deliverability

Auth emails use a responsive, branded HTML layout and include a plain-text alternative. The template improves readability, but no email design or code can guarantee inbox placement.

For production, send from a domain you own through a transactional email provider (for example Amazon SES, Postmark, or another provider with verified-domain sending). Verify the sending domain and configure the exact DNS records the provider supplies:

- **SPF** authorizes the provider to send for the domain.
- **DKIM** cryptographically signs outgoing mail.
- **DMARC** tells receiving mail systems how to handle unauthenticated messages and provides reporting.

Use an aligned sender address on that domain, keep the visible sender and reply-to consistent, and use the provider's bounce/complaint monitoring. Start with low, expected volumes and send only transactional messages users requested. Avoid shared/free Gmail SMTP for production: it offers limited control over domain authentication, reputation, and delivery diagnostics. Never send test emails to people who did not request them.

## Configure and run

1. Copy the environment example files and set API-only secrets and provider configuration:
   - `apps/api/.env.example` → `apps/api/.env`
   - `apps/web/.env.example` → `apps/web/.env.local`
2. Set `DATABASE_URL`, at least 32-character `JWT_SECRET` and `JWT_REFRESH_SECRET`, `MAIL_DRIVER`, mail sender settings, and the frontend URL used to build verification and reset links. For Google sign-in, set the same OAuth web client ID as `GOOGLE_CLIENT_ID` in the API and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the web app. Set `TRUST_PROXY_HOPS` to the exact number of trusted reverse proxies in front of Express; leave it at `0` when the API receives client connections directly.
3. Start PostgreSQL and apply the new migration:

   ```sh
   pn db:up
   pn db:migrate
   ```

4. Start the API and web app:

   ```sh
   pn dev
   ```

5. Open `http://localhost:3000/login` or `http://localhost:3000/register`. The web app calls `/api/auth/*`; the Next.js rewrite forwards these requests to Express. Access tokens stay in memory and are sent as bearer tokens; the web app restores and rotates them through the refresh endpoint. The refresh token stays in the httpOnly cookie and is never read by browser JavaScript.

## Validation scenarios

Run the focused schema and API tests:

```sh
pn --filter @launchly/shared test
pn --filter @launchly/api test
pn --filter @launchly/api typecheck
pn --filter @launchly/web typecheck
pn --filter @launchly/web build
```

Validate these flows with a disposable test email address and configured providers:

1. Register a Candidate, confirm the account is unverified, consume the emailed verification link, then sign in.
2. Sign in with an incorrect password, an unverified account, and a locked account; each request must be denied without a usable session.
3. Sign in, refresh once, then sign out; the old access token and refresh cookie must no longer grant protected access.
4. Request password recovery for registered and unregistered addresses; compare user-facing status and message, then consume a reset link once and verify existing sessions are rejected.
5. Sign in with a Google ID token; verify a new user must choose a role, Gmail/Workspace matches are linked only after provider verification, and other matching addresses require consuming the emailed link before sign-in.
6. Request a role-protected fixture route with no token, an allowed role, and a disallowed role; only the allowed role receives protected content.

See [auth.openapi.yaml](./contracts/auth.openapi.yaml) for request, response, and cookie details and [data-model.md](./data-model.md) for persisted state.

The web app provides `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, and `/google-link`. Email and Google flows require configured providers as described above.
