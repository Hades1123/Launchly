# Feature Specification: Admin Approves or Rejects Companies

**Jira**: SCRUM-71 https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-71

**Feature Branch**: `feat/SCRUM-71-admin-company-approval`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "SCRUM-71: an admin approves a pending company, or rejects it with a reason. The recruiter gets an email for both outcomes. A rejected company stays rejected; the recruiter sees the reason and registers a different company. Out of scope: the admin web page (SCRUM-72), job moderation (SCRUM-73), in-app notifications, editing or appealing a rejected company."

## Clarifications

### Session 2026-11-13

All answers come from the Jira tickets; no question needed the user.

- Q: How is a double decision by two admins prevented? → A: The decision only applies while the company is still pending; otherwise it is refused as a conflict and the current status is returned (SCRUM-77 D2).
- Q: How long may a rejection reason be? → A: 1 to 1000 characters after trimming spaces (SCRUM-76 D1).
- Q: Does the admin wait for the email before the decision is confirmed? → A: No; the email is sent after the decision is saved, and a failure is only logged (SCRUM-77 D3, SCRUM-71 D6).
- Q: Can the admin list companies that are not pending? → A: Yes, the list takes an optional status filter (pending, approved, rejected) and defaults to pending (SCRUM-76).
- Q: Who is "the recruiter" that gets the email? → A: The company's owner, at their account email (SCRUM-77 Architecture).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Admin decides on a pending company (Priority: P1)

An admin lists the companies waiting for approval, oldest first, opens one, and approves it or rejects it with a reason. An approved company becomes public and its recruiter can post jobs at once.

**Why this priority**: Without it no new company can ever be approved, so no recruiter can post a job and the MVP demo flow stops at its first step.

**Independent Test**: As the seeded admin, list pending companies, approve one and confirm its public page now opens; reject another with a reason and confirm it stays hidden and stores the reason, the reviewer and the time.

**Acceptance Scenarios**:

1. **Given** two pending companies and one approved company, **When** the admin lists pending companies, **Then** only the two pending ones are returned, oldest first.
2. **Given** a pending company, **When** the admin approves it, **Then** it is approved, its public page opens, and the reviewer and decision time are recorded.
3. **Given** a pending company, **When** the admin rejects it with a reason, **Then** it is rejected, stays hidden from the public, and the reason, reviewer and time are recorded.
4. **Given** a pending company, **When** the admin rejects it without a reason (empty or only spaces), **Then** the action is refused and the company stays pending.
5. **Given** an approved company, **When** its recruiter submits a job, **Then** the submission is accepted (existing posting rule).

---

### User Story 2 - Recruiter is told the outcome by email (Priority: P2)

When an admin decides, the company's recruiter gets an email saying the company was approved, or rejected with the reason.

**Why this priority**: The recruiter otherwise has to keep checking the site. It matters, but the decision itself (Story 1) works without it.

**Independent Test**: Approve one company and reject another; confirm one email per decision reaches the owner's address, and the rejection email contains the reason. Make the mail service fail and confirm the decision is still saved.

**Acceptance Scenarios**:

1. **Given** a pending company, **When** the admin approves it, **Then** its recruiter receives an "approved" email naming the company.
2. **Given** a pending company, **When** the admin rejects it with a reason, **Then** its recruiter receives a "rejected" email that contains the reason.
3. **Given** the mail service is down, **When** the admin decides, **Then** the decision succeeds and is saved, and the failure is logged.

---

### User Story 3 - Recruiter with a rejected company starts over (Priority: P3)

A recruiter whose company was rejected can read the reason on their own company record and register a different company, which then waits for approval.

**Why this priority**: Rejection is rare in the demo flow, but without it a rejected recruiter is locked out of Launchly for good.

**Independent Test**: Reject a recruiter's company, read the recruiter's own company record and confirm it shows the rejected status and the reason; register a new company and confirm it is created as pending and is now the recruiter's current company.

**Acceptance Scenarios**:

1. **Given** a recruiter whose company was rejected, **When** they read their own company, **Then** they see the rejected status and the reason.
2. **Given** a recruiter whose only company was rejected, **When** they register a new company, **Then** it is created as pending and becomes the company they see as their own.
3. **Given** a recruiter whose company is pending or approved, **When** they try to register another company, **Then** it is refused.

---

### Edge Cases

- E1: Two admins decide on the same company at the same time → exactly one decision is applied; the other admin is told the company was already decided and sees its current status; nothing changes.
- E2: An admin rejects without a reason → refused (Story 1, scenario 4).
- E3: A recruiter, a candidate or an anonymous visitor tries to list or decide → refused (not allowed / not signed in). (API only)
- E4: A recruiter whose company is pending or approved registers another → refused (Story 3, scenario 3).
- E5: A recruiter whose company was rejected registers a new one → allowed; the new company is pending (Story 3, scenario 2).
- An admin opens or decides on a company that does not exist → "not found".
- A reviewer's account is later removed → the decision stays; only the link to the reviewer is cleared.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Only admins MUST be able to list pending companies, view one, approve one, or reject one (D1).
- **FR-002**: The admin list MUST return companies of one status (default pending), oldest first, with the submitted company details and the owner's contact email.
- **FR-003**: Approving MUST move a pending company to approved and clear any reason; rejecting MUST move it to rejected and store the reason (D2).
- **FR-004**: Rejecting MUST require a non-blank reason of at most 1000 characters (D2).
- **FR-005**: Only a company that is still pending MAY be decided; a second decision MUST be refused without changing anything and MUST report the current status (E1).
- **FR-006**: Every decision MUST record who decided and when (D7).
- **FR-007**: An approved company MUST become publicly visible and usable for job posting immediately (D3).
- **FR-008**: The recruiter MUST be emailed for both outcomes; the rejection email MUST include the reason (D5).
- **FR-009**: A failed email MUST NOT undo or block the decision; the failure MUST be logged (D6).
- **FR-010**: A recruiter MUST see their own company's status and rejection reason.
- **FR-011**: A recruiter MAY register a new company only when none of their companies is pending or approved (D4, E4, E5); their own company is then the most recently registered one.
- **FR-012**: A rejected company MUST NOT be editable or resubmittable (D4).
- **FR-013**: The owner's contact email and the reviewer MUST appear only in admin responses; the public company page MUST NOT show them, nor the rejection reason.
- **FR-014**: A failed email MUST NOT be retried in this feature; it is logged once. A refused (second) decision MUST NOT send an email.
- **FR-015**: Emails MUST contain only the company name, the outcome and, when rejected, the reason.
- **FR-016**: Registering a new company and deciding on an old one MUST NOT leave a recruiter with two companies that are both pending or approved; the registration check and the decision each act on the current stored status.

### Key Entities

- **Company**: an employer registered by a recruiter. Adds who reviewed it and when, next to the existing status (pending, approved, rejected) and reason.
- **Job**: gets the same "reviewed by / reviewed at" fields now so SCRUM-73 reuses them; no job behaviour changes here.
- **Admin**: a user with the admin role; the reviewer of a decision.
- **Recruiter**: the company's owner; receives the outcome email.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can approve or reject a pending company in a single action, and an approved company is publicly visible right after.
- **SC-002**: 100 % of decisions record the reviewer and the time.
- **SC-003**: When two admins decide on the same company, exactly one decision is applied in 100 % of attempts.
- **SC-004**: Each decision sends exactly one email to the recruiter, and a mail outage loses 0 decisions.
- **SC-005**: A recruiter with a rejected company can register a new company on the first try.

## Assumptions

- The pending list is not paged; MVP volumes are small.
- Only the latest decision is kept; a full decision history is not needed for MVP.
- Emails follow the same language and layout as the existing account emails.
- Out of scope: the admin web page (SCRUM-72), job approval (SCRUM-73), in-app notifications, editing or appealing a rejected company, deleting rejected companies.
- Depends on: the admin role and seeded admin account (exist); company registration (SCRUM-25, Done); job posting requiring an approved company (SCRUM-26, Done).
