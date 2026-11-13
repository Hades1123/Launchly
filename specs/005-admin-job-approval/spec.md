# Feature Specification: Admin Approves or Rejects Jobs

**Jira**: SCRUM-73 https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-73

**Feature Branch**: `feat/SCRUM-73-admin-job-approval` (stacked on `feat/SCRUM-71-admin-company-approval`)

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "SCRUM-73: an admin approves a submitted job so candidates can find it, or rejects it with a reason. The recruiter gets an email for both outcomes. A resubmitted job keeps its previous rejection reason visible until approval. Out of scope: the admin page for jobs (SCRUM-74), editing a job after approval, in-app notifications."

## Clarifications

### Session 2026-11-13

All answers come from the Jira tickets; no question needed the user.

- Q: How is a double decision prevented? → A: The same way as companies (SCRUM-71): one conditional update that only applies while the job is pending; otherwise 409 with the current status (SCRUM-80 D1, SCRUM-71 review finding #3).
- Q: What status does an approved job get? → A: `PUBLISHED`, which already makes it public in search and on the job page; no new status (SCRUM-80 D2, Rejected alternative).
- Q: Who gets the email? → A: The job's creator, at their account email (SCRUM-80 D4).
- Q: What shape does the admin see? → A: The recruiter's job view plus company name, creator email and review time, for both the list and the detail (SCRUM-79 D1).
- Q: Does the recruiter see a change when the reason is kept on resubmit? → A: No; the recruiter pages only show the reason for rejected jobs (SCRUM-80 D3).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Admin decides on a submitted job (Priority: P1)

An admin lists submitted jobs, oldest first, opens one with its hiring rounds and notes, and approves it or rejects it with a reason. An approved job appears for candidates at once.

**Why this priority**: Recruiters can submit jobs since SCRUM-26, but nothing moves them on, so candidates only ever see demo jobs.

**Independent Test**: As the seeded admin, list pending jobs, approve one and confirm the public job page opens; reject another with a reason and confirm it stays hidden and stores the reason, reviewer and time.

**Acceptance Scenarios**:

1. **Given** two pending jobs and one draft, **When** the admin lists pending jobs, **Then** only the two pending jobs are returned, oldest submission first, each with its company name.
2. **Given** a pending job with two rounds and one note, **When** the admin opens it, **Then** the rounds and the note are returned in their saved order.
3. **Given** a pending job of an approved company, **When** the admin approves it, **Then** it becomes published, candidates can open it, and the reviewer and time are recorded.
4. **Given** a pending job, **When** the admin rejects it with a reason, **Then** it is rejected, stays hidden, and the reason, reviewer and time are recorded.
5. **Given** a pending job, **When** the admin rejects it with a blank reason, **Then** the action is refused and the job stays pending.

---

### User Story 2 - Recruiter is told the outcome by email (Priority: P2)

When an admin decides, the job's creator gets an email saying the job was published, or rejected with the reason.

**Why this priority**: Saves the recruiter from checking; the decision works without it.

**Independent Test**: Approve one job and reject another; confirm one email each to the creator, the rejection email containing the reason; with the mail service failing, the decision is still saved.

**Acceptance Scenarios**:

1. **Given** a pending job, **When** the admin approves it, **Then** its creator receives a "published" email naming the job and company.
2. **Given** a pending job, **When** the admin rejects it, **Then** its creator receives a "rejected" email with the reason.
3. **Given** the mail service is down, **When** the admin decides, **Then** the decision is saved and a fixed message is logged.

---

### User Story 3 - Resubmitted job keeps its previous reason (Priority: P3)

A recruiter fixes a rejected job and submits it again. The job is pending again, and the admin still sees why it was rejected last time until they approve it.

**Why this priority**: Required by SCRUM-26's acceptance criteria and lets the admin check the fix, but the first review works without it.

**Independent Test**: Reject a job, resubmit it as its recruiter, and confirm it is pending with the old reason still stored; approve it and confirm the reason is cleared.

**Acceptance Scenarios**:

1. **Given** a rejected job, **When** its recruiter resubmits it, **Then** it is pending and the previous reason is kept.
2. **Given** a resubmitted pending job with a previous reason, **When** the admin approves it, **Then** the reason is cleared.

---

### Edge Cases

- E1: Two admins decide on the same job at the same time → exactly one decision applies; the other gets "already decided" with the current status.
- E2: Reject with a blank reason → refused.
- E3: A recruiter, a candidate or an anonymous visitor calls the admin job actions → refused (not allowed / not signed in). (API only)
- E4: A rejected job is fixed and resubmitted → pending, previous reason kept.
- E5: A job whose company is no longer approved → can still be decided, but stays hidden from candidates.
- E6: The mail service fails → the decision is saved; a fixed message is logged.
- Unknown job id → "not found".

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Only admins MUST be able to list, view, approve or reject jobs.
- **FR-002**: The admin list MUST return jobs of one status (default pending), oldest submission first, with company name and creator email.
- **FR-003**: The admin job view MUST include every field the recruiter submitted, its rounds and notes in saved order, and the previous rejection reason if any.
- **FR-004**: Approving MUST move a pending job to published and clear the reason; rejecting MUST move it to rejected and store the reason.
- **FR-005**: Rejecting MUST require a non-blank reason of at most 1000 characters (same rule as companies).
- **FR-006**: Only a pending job MAY be decided; any other attempt MUST be refused without change and MUST report the current status.
- **FR-007**: Every decision MUST record who decided and when.
- **FR-008**: A published job MUST be visible to candidates immediately, as long as its company is approved.
- **FR-009**: The creator MUST be emailed for both outcomes; the rejection email MUST include the reason; a refused decision MUST NOT email.
- **FR-010**: A failed email MUST NOT undo the decision; a fixed message is logged, without recipient or server details.
- **FR-011**: Resubmitting a rejected job MUST keep the previous reason until an admin approves it.

### Key Entities

- **Job**: existing; uses `reviewedById` and `reviewedAt` added by SCRUM-71; status moves pending → published or pending → rejected here.
- **Admin**: the reviewer.
- **Recruiter**: the job's creator; receives the email.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can publish or reject a submitted job in one action, and a published job is visible to candidates right after.
- **SC-002**: 100 % of decisions record the reviewer and time.
- **SC-003**: Two concurrent decisions on one job apply exactly one, in 100 % of attempts.
- **SC-004**: Each decision sends exactly one email; a mail outage loses 0 decisions.

## Assumptions

- The list is not paged (MVP volumes), as for companies.
- Emails follow the company moderation email layout from SCRUM-71.
- Depends on SCRUM-71 (migration, mail templates, reject schema); this branch is stacked on it and is rebased once SCRUM-71 merges.
- Out of scope: the admin job page (SCRUM-74), editing approved jobs, in-app notifications, closing jobs.
