# Feature Specification: Admin Moderation Page for Companies

**Jira**: SCRUM-72 https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-72

**Feature Branch**: `feat/SCRUM-72-admin-company-moderation-page` (stacked on `feat/SCRUM-71-admin-company-approval`)

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "SCRUM-72: admins get a moderation page with a Companies tab: a queue of pending companies oldest first, a review page with everything the recruiter submitted, and approve or reject with a reason. Recruiters whose company was rejected see the reason in their workspace and a button to register a different company. Out of scope: pending jobs (SCRUM-74), search, filters, bulk actions."

## Clarifications

### Session 2026-11-13

All answers come from the Jira tickets (SCRUM-72, SCRUM-78) and SCRUM-71's API; no question needed the user.

- Q: Where does an admin reach the page? → A: A "Duyệt nội dung" entry in the account menu, shown only to admins (SCRUM-72 D1, SCRUM-78).
- Q: What does the queue show per company? → A: Name, industry, size and submitted date, oldest first (SCRUM-72 D2).
- Q: What happens if another admin decided first? → A: The page reloads the company, shows its current status and hides the buttons (SCRUM-72 E1; the API answers 409).
- Q: Are queue items paged or filterable? → A: No (SCRUM-72 Out of Scope; API has no paging).
- Q: How is the UI tested? → A: Playwright only; `apps/web` has no unit-test runner (SCRUM-78 Test Cases).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Admin reviews and decides on a company (Priority: P1)

An admin opens "Duyệt nội dung" from the account menu, sees the pending companies oldest first, opens one, reads everything the recruiter submitted, and approves it or rejects it with a reason.

**Why this priority**: Without a screen, admins cannot use the approval rules from SCRUM-71 at all.

**Independent Test**: Sign in as the seeded admin, open the queue, approve the seeded pending company and check its public page; reset, reject it with a reason and check the status shown.

**Acceptance Scenarios**:

1. **Given** pending companies, **When** the admin opens the moderation page, **Then** they see the pending companies oldest first, each with name, industry, size and submitted date.
2. **Given** a pending company, **When** the admin opens it, **Then** they see its name, address, industry, size, website, description, owner email and submitted date.
3. **Given** a pending company, **When** the admin approves it, **Then** its status shows "Đã duyệt" and its public page opens.
4. **Given** a pending company, **When** the admin chooses reject, **Then** a reason box opens and the confirm button stays disabled until a reason is typed; after confirming, the status shows "Bị từ chối" with the reason.

---

### User Story 2 - Rejected recruiter knows what to do next (Priority: P2)

A recruiter whose company was rejected sees the reason in their workspace and a button to register a different company.

**Why this priority**: Without it a rejected recruiter only sees a red badge and has no next step.

**Independent Test**: Sign in as the seeded rejected recruiter, see the reason and the button, click it and land on the empty registration form.

**Acceptance Scenarios**:

1. **Given** a recruiter whose company was rejected, **When** they open the recruiter workspace, **Then** they see "Bị từ chối", the reason and an "Đăng ký công ty khác" button.
2. **Given** that recruiter, **When** they click the button, **Then** the empty company registration form opens.

---

### Edge Cases

- E1: Another admin decided the company first → the page shows the current status and the buttons are gone.
- E2: The queue is empty → "Không có mục nào cần duyệt".
- E3: A recruiter, candidate or signed-out visitor opens the moderation page → they are sent away (signed-out visitors to the login page).
- E4: A rejected recruiter clicks "Đăng ký công ty khác" → the empty registration form opens.
- The API call fails for another reason → a readable error message, no crash.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Only admins MUST see the "Duyệt nội dung" menu entry and reach the moderation pages.
- **FR-002**: The Companies tab MUST list pending companies oldest first with name, industry, size and submitted date.
- **FR-003**: The review page MUST show every submitted field, the owner email and the submitted date.
- **FR-004**: The admin MUST be able to approve a pending company from the review page.
- **FR-005**: The admin MUST be able to reject a pending company only after typing a non-blank reason.
- **FR-006**: After a decision, or when another admin decided first, the page MUST show the current status (and reason when rejected) and MUST hide the decision buttons.
- **FR-007**: An empty queue MUST show an empty-state message.
- **FR-008**: A recruiter with a rejected company MUST see the reason and an "Đăng ký công ty khác" link to the registration form.
- **FR-009**: The layout MUST leave room for a Jobs tab (SCRUM-74) and the reason dialog MUST be reusable for jobs.
- **FR-010**: Styling MUST use the semantic tokens from `docs/Frontend-Conventions.md`.

### Key Entities

- **Admin company view**: the `adminCompanySchema` record from SCRUM-71.
- **Recruiter's own company**: `companyDtoSchema`, which now carries `moderationReason`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can go from the account menu to a decided company in at most 3 clicks plus typing a reason.
- **SC-002**: A non-admin never sees moderation data (0 cases in e2e).
- **SC-003**: A rejected recruiter reaches the registration form in 1 click from their workspace.

## Assumptions

- Pages are client components using the browser API client, like the recruiter pages.
- Depends on SCRUM-71 (#25); this branch is stacked on it.
- Out of scope: jobs tab (SCRUM-74), search, filters, bulk actions, in-app notifications.
