# Feature Specification: View Hiring Process and Company Notes

## User Stories
- **US1 (P1)**: As a candidate (intern or fresher), I want to see a job's hiring process (each round's name, format, and estimated duration) on the job detail page, so that I can prepare before I apply. (FR-001, FR-003, FR-005, FR-006)
- **US2 (P1)**: As a recruiter, I want jobs that are not approved and published to stay invisible to the public, so that drafts, pending, rejected, and closed posts never leak. (FR-004, FR-008, FR-009)
- **US3 (P2)**: As a candidate, I want to read the notes the company left for applicants, so that I know what the company expects. (FR-002)
- **US4 (P2)**: As a recruiter, I want my process and notes shown exactly as I configured them, so that candidates get accurate information. (FR-001, FR-002, FR-007)

## Acceptance Criteria (Jira SCRUM-29)
- Process and notes present -> timeline plus "Company notes" shown.
- No process -> shows "Company has not provided the process" and hides the notes section.
- Rounds shown in recruiter order with name, format, and estimated duration.
- Notes shown in full (up to 5) in saved order.
- A non-approved job URL -> "Not found".
- On mobile the vertical timeline is readable.
- Tech notes: read-only job detail endpoint returns rounds sorted by stored order plus notes in saved order.
- Visibility: must reuse the same public listing rule as search SCRUM-28 (Draft, Pending, Rejected, Closed never public).
- Guests can open the page; applying requires login.

## Functional Requirements
- **FR-001 (US1, US4)**: Rounds are shown in stored position order with name, format, and estimated duration. A null format or duration is omitted, never invented.
- **FR-002 (US3, US4)**: All stored notes are shown in position order under "Ghi chú từ công ty".
- **FR-003 (US1)**: A job with zero rounds shows the empty-state message and no notes section (A7).
- **FR-004 (US2)**: Only jobs matching A3 are returned or rendered. Every other status and any unknown id -> identical 404 and a Not found page.
- **FR-005 (US1)**: Guests can view the endpoint and the page without a session.
- **FR-006 (US1)**: The timeline is vertical and readable at 375 px width, and laid out as a grid from md up.
- **FR-007 (US4)**: Stored text is rendered unchanged (no truncation, reordering, or HTML injection).
- **FR-008 (US2)**: The public rule exists once, as `publicJobWhere`, and is documented for SCRUM-28.
- **FR-009 (US2)**: The response excludes salary, publicationStatus, moderationReason, and createdById.

## Assumptions
- **A1**: `JobStage.format String?` and `JobStage.estimatedDuration String?`. Both are free text and nullable.
- **A2**: New model `JobNote { id, jobId, content, position }` with `@@unique([jobId, position])` and `@@index([jobId])`. Limit of 5 notes enforced by write validation (SCRUM-26).
- **A3**: Public rule: `publicationStatus = PUBLISHED` AND `company.moderationStatus = APPROVED`. Exported as `publicJobWhere`.
- **A4**: `GET /api/jobs/:id` needs no auth. `:id` validated as UUID (400 on error). Non-public jobs return 404 NOT_FOUND.
- **A5**: DTO omits salary and internal fields.
- **A6**: UI copy in Vietnamese: Empty state: "Công ty chưa cung cấp quy trình tuyển dụng.", Notes heading: "Ghi chú từ công ty", Not found: "Không tìm thấy tin tuyển dụng".
- **A7**: When a job has no rounds, the notes section is hidden even if notes exist.
- **A8**: Web phase uses typecheck, lint, build, token check, and manual viewport inspection (no web test runner).
