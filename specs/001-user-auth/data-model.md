# Data Model: User Authentication and Authorization

## User

Extend the existing `User` entity; preserve its UUID identity, role enum, timestamps, unique email, and optional Google subject.

| Field | Type | Constraints and purpose |
|---|---|---|
| `id` | String | Existing UUID primary key. |
| `email` | String | Store a normalized lowercase address; unique after normalization. |
| `passwordHash` | String, nullable | Scrypt-derived hash and parameters; null for Google-only accounts. |
| `googleId` | String, nullable | Unique stable Google subject; never trust a client-provided value. |
| `fullName` | String, nullable | Optional until profile onboarding; Google-provided name may populate it. |
| `role` | `UserRole` | `CANDIDATE`, `RECRUITER`, or `ADMIN`; self-service flows permit only the first two. |
| `emailVerifiedAt` | DateTime, nullable | Null until a valid email verification token is consumed. A verified Google email may set this during safe account linking. |
| `lockedAt` | DateTime, nullable | Non-null means authentication is denied. Lock management is outside this feature. |
| `createdAt`, `updatedAt` | DateTime | Existing lifecycle timestamps. |

### State transitions

- Email registration creates an unverified, unlocked user with a password hash and selected non-admin role.
- Successful email verification sets `emailVerifiedAt`; token consumption is atomic.
- Google registration creates a verified account only after Google identity and verified email are validated and the user selected a permitted role.
- A matching `gmail.com` address with `email_verified=true`, or a Google Workspace address whose verified `hd` claim exactly matches the email domain, can be linked after Google identity validation; an existing role is preserved.
- A matching email outside those domains requires a one-time email challenge bound to the Google subject; consuming it verifies the account email, links the identity, and creates a session.
- Password reset replaces the hash and revokes every active session.
- A locked user cannot authenticate or refresh a session.

## AuthToken

Stores one-time email-verification and password-reset credentials.

| Field | Type | Constraints and purpose |
|---|---|---|
| `id` | String | UUID primary key. |
| `userId` | String | Foreign key to `User`; cascade-delete with the user. |
| `tokenHash` | String | Unique SHA-256 hash of a random token; never store the raw token. |
| `purpose` | Enum | `EMAIL_VERIFICATION`, `PASSWORD_RESET`, or `GOOGLE_ACCOUNT_LINK`. |
| `providerSubject` | String, nullable | Google `sub` for a link challenge; must match the verified identity being linked. |
| `expiresAt` | DateTime | 24 hours for email verification; 30 minutes for password reset or Google link confirmation. |
| `consumedAt` | DateTime, nullable | Set exactly once when the token is successfully used. |
| `createdAt` | DateTime | Creation timestamp; supports invalidating prior outstanding tokens. |

Indexes support lookup by `(userId, purpose)` and expiry cleanup. Resending verification or requesting a new reset invalidates prior outstanding tokens of the same purpose.

## AuthSession

Persists refresh-token rotation and immediate session revocation.

| Field | Type | Constraints and purpose |
|---|---|---|
| `id` | String | UUID primary key; included as the access JWT session claim. |
| `userId` | String | Foreign key to `User`; cascade-delete with the user. |
| `refreshTokenHash` | String | Unique keyed hash of the current opaque refresh token. |
| `expiresAt` | DateTime | Session expiry; proposed default is 7 days. |
| `revokedAt` | DateTime, nullable | Non-null means the session cannot refresh or authorize access. |
| `createdAt`, `updatedAt` | DateTime | Session lifecycle timestamps. |

Every protected request verifies the access JWT and checks that its session exists, is unexpired, and is not revoked, and that the user is still unlocked. Refresh rotates the opaque token hash atomically. Logout revokes the session and clears the refresh cookie scoped to the browser-facing `/api/auth` rewrite path.

## Migration and privacy notes

- Add a new forward-only migration; do not edit the existing initial migration.
- Make `fullName` nullable because the sign-up story requires only email, password, and role.
- Add indexes and foreign keys for token/session lookups and cleanup.
- Never serialize password hashes, token hashes, Google subject, or raw credentials to API responses.
- Use database transactions and conditional updates for token consumption, session rotation, and reset-triggered revocation.
