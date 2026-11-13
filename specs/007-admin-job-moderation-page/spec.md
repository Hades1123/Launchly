# Feature Specification: Admin Moderation Page for Jobs

**Jira**: SCRUM-74 https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-74

**Feature Branch**: `feat/SCRUM-74-admin-job-moderation-page` (stacked on SCRUM-72, with SCRUM-73 merged in)

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "SCRUM-74: the moderation page gets a Jobs tab. Admins open a submitted job, read every detail including its hiring rounds and notes, and approve or reject it with a reason. Resubmitted jobs show the previous rejection reason. Out of scope: search, filters, bulk actions, editing the job as admin."

## Clarifications

### Session 2026-11-13

All answers come from SCRUM-74, SCRUM-81 (updated 2026-11-13) and the SCRUM-72 / SCRUM-73 work; no question needed the user.

- Q: How are rounds and notes shown? → A: With the candidate timeline and notes components, so the admin sees what candidates will see (SCRUM-81 D1).
- Q: What does the queue show per job? → A: Title, company, level and submitted date, oldest first (SCRUM-74 D1).
- Q: Where does the reject dialog come from? → A: The `RejectDialog` from SCRUM-72, which keeps the reason when the call fails.
- Q: What if another admin decided first? → A: The page reloads the job, shows its status and hides the buttons, as for companies (SCRUM-74 E1).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Admin reviews and decides on a job (Priority: P1)

An admin switches to the Jobs tab, sees submitted jobs oldest first, opens one, reads all its details with its hiring rounds and notes, and approves or rejects it with a reason.

**Why this priority**: Without it, submitted jobs never reach candidates and the MVP demo flow stops.

**Independent Test**: As the seeded admin, open the Jobs tab, open a submitted job with rounds and notes, approve it and find it on the public jobs page; reject another with a reason.

**Acceptance Scenarios**:

1. **Given** submitted jobs, **When** the admin opens the Jobs tab, **Then** they see them oldest first with title, company, level and submitted date.
2. **Given** a submitted job with rounds and notes, **When** the admin opens it, **Then** they see its description, level, location, salary, requirements, benefits, the rounds in order with format and duration, and the notes in order.
3. **Given** a submitted job, **When** the admin approves it, **Then** it shows "Đã duyệt" and candidates can open it.
4. **Given** a submitted job, **When** the admin rejects it with a reason, **Then** it shows "Bị từ chối" with the reason and the recruiter sees the reason.

---

### User Story 2 - Admin checks a resubmitted job (Priority: P2)

When a recruiter fixes a rejected job and submits it again, the admin sees "Đã từ chối trước đó" with the old reason, so they can check the fix.

**Why this priority**: Saves the admin from guessing what was wrong, but the first review works without it.

**Independent Test**: Reject a job, resubmit it as its recruiter, open it as admin and see the previous reason.

**Acceptance Scenarios**:

1. **Given** a resubmitted job with a previous reason, **When** the admin opens it, **Then** they see "Đã từ chối trước đó" and the reason.

---

### Edge Cases

- E1: Another admin decided first → current status shown, buttons gone.
- E2: No submitted jobs → "Không có mục nào cần duyệt".
- E3: A job without notes → no notes section.
- E4: A resubmitted job → "Đã từ chối trước đó" with the old reason.
- Unknown job id → a Vietnamese "not found" message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The moderation page MUST offer a Jobs tab next to the Companies tab.
- **FR-002**: The Jobs tab MUST list submitted jobs oldest first with title, company, level and submitted date, or an empty-state message.
- **FR-003**: The job review page MUST show every submitted field, the creator email, the rounds in saved order with format and duration, and the notes in saved order (hidden when there are none).
- **FR-004**: The admin MUST be able to approve a submitted job, or reject it after typing a non-blank reason.
- **FR-005**: After a decision, or when another admin decided first, the page MUST show the current status (and reason when rejected) and hide the buttons.
- **FR-006**: A pending job that has a previous reason MUST show "Đã từ chối trước đó" with that reason.
- **FR-007**: Only admins reach these pages (SCRUM-72 guard); styling uses semantic tokens only.

### Key Entities

- **Admin job view**: `adminJobSchema` from SCRUM-73 (recruiter job fields, company name, creator email, review time).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can go from the Jobs tab to a decided job in at most 2 clicks plus a reason.
- **SC-002**: Rounds and notes appear in the same order as the recruiter saved them, in 100 % of cases.
- **SC-003**: A published job is visible to candidates right after approval.

## Assumptions

- The candidate timeline and notes keep their English headings (SCRUM-81 D1).
- Depends on SCRUM-72 (#29) and SCRUM-73 (#27); this branch carries both until they merge.
- Out of scope: search, filters, bulk actions, admin editing of jobs.
