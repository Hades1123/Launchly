# Feature Specification: User Authentication and Authorization

**Feature Branch**: `feat/SCRUM-23-authentication`

**Created**: 2026-11-07

**Status**: Draft

**Input**: SCRUM-23 ticket: registration, verification, login, logout, Google sign-in, password recovery, account locking, and role-based access.

## Clarifications

### Session 2026-11-07

- Q: If a verified Google email matches an existing account that is not linked to Google, how should the accounts be linked? → A: Automatically link only after the backend verifies the Google identity and Google confirms the email is verified.
- Q: For a matching email outside Gmail or Google Workspace, what additional proof is required before linking? → A: Send a single-use confirmation link to the address already registered to the account; link only after it is consumed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and verify an account (Priority: P1)

As a visitor, I can register with an email address, password, and Candidate or Recruiter role, then verify my email to activate the account.

**Why this priority**: Registration and verification establish the identities required by all other platform features.

**Independent Test**: Register a new Candidate or Recruiter, verify the address using the delivered link, and confirm the account can then sign in.

**Acceptance Scenarios**:

1. **Given** a visitor provides a valid, unused email address, password, and permitted role, **When** they submit registration, **Then** an unverified account is created and a verification message is sent.
2. **Given** an email address is already registered, **When** a visitor attempts registration with it, **Then** registration is rejected with a clear duplicate-account error.
3. **Given** an unverified account has a valid verification link, **When** the user opens it before expiry, **Then** the account becomes verified and can sign in.
4. **Given** a verification link is invalid, expired, or already used, **When** the user opens it, **Then** verification is rejected and the user is offered a way to request another link.
5. **Given** an unverified account, **When** the user requests another verification message, **Then** a fresh verification link is sent without making the account active.
6. **Given** a visitor tries to register as an administrator, **When** they submit registration, **Then** the request is rejected.

---

### User Story 2 - Sign in and manage an authenticated session (Priority: P1)

As a registered user, I can sign in with my credentials and sign out when finished, while locked, unverified, or invalid accounts cannot gain access.

**Why this priority**: Reliable session handling is necessary to protect every authenticated feature.

**Independent Test**: Sign in with valid credentials, confirm protected access, sign out, and verify that the former session no longer grants access.

**Acceptance Scenarios**:

1. **Given** an active, verified Candidate or Recruiter account, **When** the user submits the correct email and password, **Then** they are signed in and can access permitted features.
2. **Given** a registered account, **When** the user submits an incorrect password, **Then** sign-in fails with a clear error and no authenticated session is created.
3. **Given** an unverified account, **When** the user attempts password sign-in, **Then** access is denied and the user is directed to email verification.
4. **Given** a locked account, **When** the user attempts sign-in, **Then** access is denied with a clear locked-account message.
5. **Given** an authenticated user, **When** they sign out, **Then** the session is invalidated and protected access requires signing in again.

---

### User Story 3 - Sign in with Google (Priority: P2)

As a visitor, I can use my Google identity to sign in without creating a separate password; a first-time user chooses whether to join as a Candidate or Recruiter.

**Why this priority**: Google sign-in reduces onboarding friction while preserving the platform's role model.

**Independent Test**: Sign in with a valid Google identity, choose a role for a new account, and confirm that a returning account is recognized.

**Acceptance Scenarios**:

1. **Given** a visitor presents a valid Google identity for an existing linked account, **When** they sign in with Google, **Then** they are signed in to that account.
2. **Given** a visitor presents a valid Google identity for a matching, unlinked account and Google provides a verified Gmail or Workspace email, **When** they sign in with Google, **Then** the identity is linked and the existing account is signed in.
3. **Given** a visitor presents a valid Google identity for a matching, unlinked account outside Gmail or Workspace, **When** they sign in with Google, **Then** a single-use confirmation link is sent to the email already registered to the account; consuming it verifies that email, links the identity, and issues a session.
4. **Given** a visitor presents a valid Google identity not previously registered, **When** they choose Candidate or Recruiter, **Then** an account with that role is created and they are signed in.
5. **Given** a first-time Google user has not selected a role, **When** they submit Google sign-in, **Then** no account is created and they are asked to choose a permitted role.
6. **Given** a Google identity cannot be verified, **When** it is submitted, **Then** sign-in is rejected and no account or session is created.

---

### User Story 4 - Recover account access (Priority: P2)

As a registered user who forgot their password, I can request a time-limited reset link and set a new password without revealing whether an email address is registered.

**Why this priority**: Account recovery lets users regain access while limiting account enumeration and token abuse.

**Independent Test**: Request recovery for both registered and unregistered addresses, then use a valid reset link once and verify that it cannot be reused.

**Acceptance Scenarios**:

1. **Given** a registered email address, **When** the user requests password recovery, **Then** the platform sends a reset link that expires after 30 minutes.
2. **Given** a registered or unregistered email address, **When** the user requests password recovery, **Then** the platform returns the same user-facing response.
3. **Given** a valid, unused reset link, **When** the user submits a new valid password, **Then** the password is changed and the link cannot be used again.
4. **Given** an invalid, expired, or already used reset link, **When** the user submits it, **Then** the password remains unchanged and an error is returned.

---

### User Story 5 - Access role-appropriate features (Priority: P1)

As a signed-in user, I can access features for my role, while users with other roles cannot access protected features they are not authorized to use.

**Why this priority**: Role checks prevent unauthorized access to candidate, recruiter, and administrative data and operations.

**Independent Test**: Authenticate as each role and request features reserved for another role; unauthorized requests are denied without exposing protected content.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an allowed role, **When** they request a feature for that role, **Then** access is granted.
2. **Given** a signed-in user with a role not allowed for a feature, **When** they request it, **Then** access is denied with a forbidden response and protected content is not returned.
3. **Given** an unauthenticated user, **When** they request a protected feature, **Then** access is denied and no protected content is returned.

### Edge Cases

- Email addresses differing only by case must not create separate accounts.
- Concurrent registration or token consumption attempts must not create duplicate accounts or allow a single-use token to succeed more than once.
- A verification or password-reset token must not be usable after expiry or after it has already been consumed.
- Replacing a password must invalidate existing authenticated sessions.
- A Google identity may be auto-linked only when the verified ID token has `email_verified=true` and either the email domain is `gmail.com` or the Google Workspace `hd` claim exactly matches the email domain; other matching domains require consuming a confirmation link sent to the existing account email.
- A Google account-link confirmation token must be single-use and expire; it must not create a session or change account links when invalid.
- Temporary email-provider or Google-provider failures must not create an account or report an email as sent when delivery failed.
- Login and password-recovery requests must be rate-limited without disclosing whether an account exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST allow visitors to register with an email address, password, and Candidate or Recruiter role.
- **FR-002**: The platform MUST reject duplicate email addresses and prevent self-registration of administrator accounts.
- **FR-003**: The platform MUST create email-registered accounts as unverified and send a verification link that is single-use and expires after 24 hours.
- **FR-004**: The platform MUST allow users to request a replacement verification link without activating the account.
- **FR-005**: The platform MUST activate an email-registered account only after successful use of a valid verification link.
- **FR-006**: The platform MUST allow verified, unlocked users to sign in with their email address and password.
- **FR-007**: The platform MUST deny sign-in for incorrect credentials, unverified accounts, and locked accounts without creating an authenticated session.
- **FR-008**: The platform MUST allow authenticated users to sign out and MUST invalidate the signed-out session.
- **FR-009**: The platform MUST allow users to sign in with a backend-verified Google identity and MUST require Google `email_verified=true` before account creation or linking.
- **FR-010**: The platform MUST require first-time Google users to select Candidate or Recruiter before creating an account; administrators cannot self-register.
- **FR-011**: The platform MUST send a single-use password-reset link that expires after 30 minutes to a registered email that requests recovery.
- **FR-012**: Password-recovery requests MUST return the same user-facing response for registered and unregistered email addresses.
- **FR-013**: Successful password reset MUST invalidate the reset link and existing authenticated sessions.
- **FR-014**: The platform MUST enforce authentication and role authorization on protected features and deny users with disallowed roles without returning protected content.
- **FR-015**: The platform MUST rate-limit sign-in and password-recovery requests.
- **FR-016**: The platform MUST store passwords and verification, recovery, or account-link tokens in a form that does not expose their original values.
- **FR-017**: The platform MUST automatically link a matching existing account only when the verified Google ID token has `email_verified=true` and either the email domain is `gmail.com` or the Google Workspace `hd` claim exactly matches the email domain. For other domains, it MUST send a single-use, time-limited confirmation link to the already-registered email and link only after successful consumption; consuming that link MUST verify the existing account email before issuing a session.

### Key Entities

- **User account**: Email identity, password credential when applicable, display name, selected role, verification state, lock state, and account lifecycle timestamps.
- **Verification request**: A single-use credential tied to an unverified account and an expiration time.
- **Password-reset request**: A single-use credential tied to an account and an expiration time.
- **Authenticated session**: A time-limited grant of access associated with a user; it can be invalidated at sign-out or after a password change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid registration requests with an available, configured email provider create an unverified Candidate or Recruiter account and send a verification message without administrator intervention.
- **SC-002**: 0% of sign-in attempts with an incorrect password, unverified account, or locked account receive authenticated access.
- **SC-003**: A verification link works at most once within 24 hours; invalid, expired, and reused links activate 0 accounts.
- **SC-004**: 100% of password-recovery requests return the same user-facing status and message whether or not the email is registered.
- **SC-005**: 100% of requests by unauthenticated users or users with a disallowed role are denied without protected content.
- **SC-006**: 100% of previously issued sessions are denied after sign-out or password reset.

## Assumptions

- The API implementation is in scope; user-facing pages and navigation are owned by the web feature.
- Email delivery and Google OAuth credentials are supplied through backend deployment configuration; secrets are never exposed to the web client.
- Email registration requires only the email address, password, and role; a display name can be collected later through profile onboarding.
- Verification links expire after 24 hours and password-reset links after 30 minutes, as proposed in the ticket.
- Google account-link confirmation links expire after 30 minutes.
- If email delivery fails during registration, the request returns an error and leaves no new account or usable verification token.
- Logout is included because it is explicitly listed in the user story and proposed endpoint, and the requester asked to implement ticket-described behavior when in scope.
- Account lock state is provisioned by a trusted administrator or platform process; this feature enforces the lock during authentication but does not provide lock-management UI or endpoints.
- Only Candidate and Recruiter roles are available to self-service registration and first-time Google sign-in.
