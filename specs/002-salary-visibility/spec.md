# Feature Specification: Salary Visibility Control for Public Job Data

**Feature Branch**: `feat/SCRUM-38-salary-visibility`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "SCRUM-38: a recruiter can hide a job's salary. Candidate-facing job detail and search data then show 'Negotiable' and never expose the real salary. The hidden flag, the shared public salary shape and the mapping rule already exist. Remaining: a minimal public job detail read (published jobs at approved companies only, not found otherwise) that applies the rule. Recruiter write path (setting the flag) is out of scope (SCRUM-40). Job search (SCRUM-28) is now merged and MUST apply the same rule."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Candidate never sees a hidden salary (Priority: P1)

A candidate opens a public job whose recruiter chose to hide the salary. The job shows as "Negotiable" and no real salary figure is present anywhere in the data they receive.

**Why this priority**: This is the privacy promise to recruiters. A single leak breaks trust in the option.

**Independent Test**: Fetch a public job with a hidden salary and confirm the response marks it negotiable with no minimum or maximum, and that the stored figures appear nowhere in the response.

**Acceptance Scenarios**:

1. **Given** a published job at an approved company with salary 2000-4000 and hidden salary, **When** a candidate requests the job, **Then** the salary is negotiable with no minimum and no maximum, and neither 2000 nor 4000 appears in the response.
2. **Given** the same job, **When** the recruiter had never set a hidden flag (default), **Then** the real range is shown.

---

### User Story 2 - Candidate sees a visible salary (Priority: P1)

A candidate opens a public job whose salary is not hidden and sees the minimum and maximum the recruiter entered.

**Why this priority**: Hiding must not break the normal case.

**Independent Test**: Fetch a public job with a visible salary and confirm the range is returned and not marked negotiable.

**Acceptance Scenarios**:

1. **Given** a published job with salary 2000-4000, not hidden, **When** requested, **Then** the range 2000-4000 is returned and not negotiable.
2. **Given** a published job with no salary entered and not hidden, **When** requested, **Then** no figures are returned and it is not marked negotiable.

---

### User Story 3 - Unpublished jobs stay private (Priority: P2)

Only published jobs at approved companies are reachable by candidates. Anything else behaves exactly like a job that does not exist.

**Why this priority**: The salary rule is meaningless if hidden or draft jobs can be read at all; the public detail read must not become a new leak.

**Independent Test**: Request a draft job, a pending job and an unknown id and confirm identical not-found results.

**Acceptance Scenarios**:

1. **Given** a job that is draft, pending, rejected or closed, or whose company is not approved, **When** requested, **Then** the result is the same not-found result as for an unknown id.
2. **Given** an id that is not a valid identifier, **When** requested, **Then** the request is rejected as invalid.

### Edge Cases

- Salary hidden but figures stored: figures stay stored for the recruiter, never returned publicly.
- Only one of minimum or maximum entered: returned as given when visible, both null when hidden.
- Recruiter later un-hides: the real range is shown from then on, with no stale hidden value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each job MUST carry a recruiter-controlled "hide salary" setting, off by default.
- **FR-002**: When the setting is on, every candidate-facing representation of the job MUST show salary as negotiable with no minimum and no maximum.
- **FR-003**: When the setting is off, candidate-facing data MUST show the stored minimum and maximum (either may be absent) and MUST NOT mark the salary negotiable.
- **FR-004**: Candidates MUST be able to read a single public job's details, including its salary as defined by FR-002/FR-003.
- **FR-005**: Only jobs that are published at an approved company MUST be readable publicly; all others MUST produce the same not-found result as an unknown job.
- **FR-006**: An invalid job identifier MUST be rejected as invalid input without querying job data.
- **FR-007**: The salary-display rule and the public-visibility rule MUST each be defined in one place and used by both job search and job detail.
- **FR-009**: Job search results MUST present salary by FR-002/FR-003 and MUST NOT include raw stored figures for hidden jobs.
- **FR-008**: Public job data MUST NOT include internal fields (publication status, moderation reason, creator).

### Key Entities

- **Job**: A posting owned by a company, with an optional salary range and a hide-salary setting.
- **Public salary**: What a candidate may see: a negotiable marker plus an optional minimum and maximum.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested hidden-salary jobs, no stored salary figure appears anywhere in candidate-facing data.
- **SC-002**: In 100% of tested visible-salary jobs, the stored range is shown unchanged.
- **SC-003**: Every non-public job state and unknown id returns an identical result, so a candidate cannot tell whether a hidden job exists.
- **SC-004**: In 100% of tested hidden-salary jobs, job search results also show negotiable with no figures.

## Assumptions

- Setting the hide-salary option from the recruiter form is delivered by SCRUM-40 and is out of scope; tests set it directly.
- Job search (SCRUM-28) is merged and currently returns raw salary figures; this feature changes it to the public salary rule (a breaking change to the search result shape, with the web list updated in the same change).
- Public job detail is minimal here: id, title, description, level, location, company name and salary. Hiring rounds and notes belong to SCRUM-29.
- Public reads require no sign-in.
- Salary stays in a single currency unit as already stored; currency display is out of scope.
- Database flag, shared public salary shape and mapping rule already exist on this branch.
- Public detail reuses the search module's visibility rule so search and detail cannot disagree.
