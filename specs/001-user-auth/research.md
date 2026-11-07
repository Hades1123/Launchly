# Research: User Authentication and Authorization

## Decisions

### Password hashing

- **Decision**: Use Node.js `crypto.scrypt` asynchronously with a random per-password salt and stored algorithm parameters.
- **Rationale**: Scrypt is a slow password KDF already available in the supported Node.js runtime, so it avoids another package while meeting the ticket's bcrypt/argon2-style requirement. Verify hashes with a constant-time comparison.
- **Alternatives considered**: bcrypt and Argon2. Both are acceptable slow KDFs, but add a dependency and, depending on the package, native build requirements.

### Access and refresh credentials

- **Decision**: Sign short-lived access JWTs with the existing `JWT_SECRET`; issue 256-bit opaque refresh tokens in an httpOnly cookie and persist only a keyed hash of each refresh token. Persist a session ID in the access JWT and check the associated session and user on protected requests.
- **Rationale**: Opaque refresh credentials make rotation and revocation straightforward. Checking the persisted session makes logout and password-reset revocation effective immediately rather than only after access-token expiry.
- **Alternatives considered**: Self-contained refresh JWTs, which are harder to revoke without additional persistence; storing access tokens in cookies, which complicates CSRF protections and API clients.
- **Chosen library**: `jsonwebtoken`, already identified in the project setup plan for later API work. Pin to the compatible v9 range and verify an explicit HS256 algorithm, issuer, audience, and expiry.
- **Verification caveat**: Signature validation alone does not revoke JWTs. Verify an explicit algorithm, issuer, audience, and expiry, then load the session/user identified by the JWT before authorizing a request. See the [jsonwebtoken documentation](https://github.com/auth0/node-jsonwebtoken#readme) and [RFC 7519 expiry claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4).

### Google identity

- **Decision**: Verify Google ID tokens on the API using `google-auth-library` and the configured client ID. Require a verified email, use the stable Google subject as the provider identity, and only auto-link a matching existing account when Google confirms the email is verified.
- **Rationale**: This follows the ticket and the clarification recorded in the spec. The client never supplies trusted profile claims.
- **Alternatives considered**: Trusting client-decoded claims or accepting an OAuth access token without validating the ID token; both fail to establish a verified identity.
- **Verified-email caveat**: Google documents that `email_verified` is not equivalent to current mailbox ownership for every non-Gmail address. Auto-link only verified Gmail addresses or Google Workspace addresses with a matching `hd` claim. For other domains, require a separate confirmation link to the address already on the existing account; bind its single-use token to the verified Google subject and expire it after 30 minutes.
- **Reference**: Use [`OAuth2Client.verifyIdToken`](https://docs.cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/oauth2client#verifyidtoken) with the configured audience and verified payload; follow [Google's server-side ID-token verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

### Verification and reset tokens

- **Decision**: Generate cryptographically random, single-use tokens; persist only SHA-256 token hashes with purpose, expiry, and consumption state. Verification lifetime is 24 hours; password-reset lifetime is 30 minutes.
- **Rationale**: A database-backed lifecycle supports expiry, one-time consumption, resend invalidation, and audit-free secret storage.
- **Alternatives considered**: Signed stateless links, which do not naturally support single-use invalidation or resend invalidation.

### Email delivery

- **Decision**: Define a small mail-sender interface and provide SMTP via Nodemailer and SES via AWS SDK v3, selected with the existing `MAIL_DRIVER`.
- **Rationale**: Both drivers are anticipated by the project architecture and environment contract. The auth service depends only on the interface; credentials remain API-only.
- **Alternatives considered**: A vendor SDK in the auth service, or implementing only one of the already configured drivers.
- **Failure handling**: Provider errors must be observable in server logs without including tokens, passwords, or full credential-bearing URLs. Registration must not report delivery as successful if sending failed. Forgot-password keeps the same external response for registered and unregistered addresses.
- **Transport requirements**: Require TLS/STARTTLS for SMTP; avoid raw protocol debugging in production. SES uses the SDK credential provider chain and a verified sender identity. See [Nodemailer SMTP](https://nodemailer.com/smtp), [SESv2 SendEmail](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html), and [AWS SDK credential providers](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

### Request throttling

- **Decision**: Apply endpoint-specific limits with `express-rate-limit` to login and password recovery. Configure production proxy trust deliberately.
- **Rationale**: The library supplies standard Express middleware and an in-memory store without requiring another service. The current project has no shared cache or multi-instance deployment contract.
- **Alternatives considered**: Adding Redis or a custom PostgreSQL counter table. Those introduce infrastructure or application complexity not required by the current scale assumptions.
- **Operational caveat**: The default memory store is per process; deployments with multiple API instances must configure a shared store before relying on globally consistent limits.
- **Reference**: [express-rate-limit data stores](https://express-rate-limit.mintlify.app/reference/stores) and [configuration](https://express-rate-limit.mintlify.app/reference/configuration).

### Shared contracts and layering

- **Decision**: Define request/response Zod schemas in `@launchly/shared`, validate at route boundaries, and implement route → controller → service → Prisma.
- **Rationale**: This is required by the project constitution and prevents frontend/API contract drift.
- **Alternatives considered**: API-local handwritten request types or Prisma-derived response objects; both violate project governance and risk exposing private fields.

## Dependencies to Add

- `jsonwebtoken`: signed access tokens.
- `google-auth-library`: Google ID-token verification.
- `nodemailer` and its TypeScript types: SMTP provider.
- `@aws-sdk/client-sesv2`: SES provider.
- `express-rate-limit`: request throttling.

Node.js `crypto` supplies scrypt, random tokens, and token hashing; no password-hashing package is required.
