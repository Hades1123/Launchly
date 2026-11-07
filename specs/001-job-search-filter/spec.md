# Feature Specification: Search and Filter Jobs

**Feature Branch**: `feat/SCRUM-28-search-filter-jobs`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "SCRUM-28 Search and Filter Jobs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public Job Listing and Multi-Criteria Filtering (Priority: P1)

As a candidate (intern or fresher), I want to filter public job postings by career level (Intern, Fresher, Senior), industry, and location, so that I only see positions that match my career stage and preferences.

**Why this priority**: Core value proposition for candidate job discovery; essential entry point for finding suitable opportunities on Launchly.

**Independent Test**: Can be tested by selecting specific filter options (e.g., Level = "Intern", Industry = "Technology") on the jobs page and verifying that all displayed results strictly match every selected criterion.

**Acceptance Scenarios**:

1. **Given** multiple active approved jobs across various levels, **When** the candidate selects the "Intern" level filter, **Then** only jobs with the Intern level are displayed.
2. **Given** a candidate selects both an industry (e.g., "Technology") and a location (e.g., "Ho Chi Minh City"), **When** the filters are applied, **Then** all returned jobs satisfy both conditions simultaneously.
3. **Given** unapproved, draft, closed, or rejected jobs exist in the system, **When** any candidate searches or filters jobs, **Then** non-published jobs and jobs from unapproved companies are never returned in public results.

---

### User Story 2 - Accent-Tolerant and Case-Insensitive Keyword Search (Priority: P1)

As a candidate, I want to search for jobs by keyword matching job titles or company names without worrying about letter case or Vietnamese diacritics, so that I can quickly find relevant roles even when typing without accents.

**Why this priority**: High impact on usability for Vietnamese users who frequently type queries without accents (e.g., "lap trinh" instead of "lập trình") or use brand abbreviations.

**Independent Test**: Can be tested by searching unaccented strings (e.g., "lap trinh") and verifying that jobs containing accented titles (e.g., "Lập trình viên Frontend") or matching company names are retrieved accurately.

**Acceptance Scenarios**:

1. **Given** jobs with titles containing Vietnamese accents, **When** a user searches with the unaccented version of the keyword, **Then** matching jobs are returned in the results.
2. **Given** a keyword that matches a company name, **When** the user searches, **Then** jobs posted by that company appear in the search results.
3. **Given** mixed-case or whitespace-padded input, **When** the search is executed, **Then** the system trims excess spaces, ignores letter case, and returns matching jobs.

---

### User Story 3 - Paginated Results with URL Query State (Priority: P1)

As a candidate, I want job search and filter results to be paginated and reflected in the browser URL, so that page load times remain fast and I can share or bookmark filtered search results.

**Why this priority**: Preserves browser navigation, reload persistence, shareable links, and predictable performance on large result sets.

**Independent Test**: Can be tested by applying filters and advancing to page 2, copying the URL to a new browser window, and confirming the exact same page number and filters remain active.

**Acceptance Scenarios**:

1. **Given** more results than the default page size limit, **When** the candidate navigates to page 2, **Then** the next batch of jobs is displayed, and the active filters remain applied.
2. **Given** an active search with filters and a specific page, **When** the user reloads the page or shares the link, **Then** the page restores the exact search keyword, selected filters, and page index from the URL query parameters.

---

### User Story 4 - Empty Results State and Filter Reset (Priority: P2)

As a candidate, when no jobs match my combined search criteria, I want to see a clear and helpful empty state with an easy option to clear all filters, so that I can quickly resume searching without getting stuck.

**Why this priority**: Essential UX feedback loop preventing user drop-off when filter combinations yield zero results.

**Independent Test**: Can be tested by searching an impossible keyword or filter combination, verifying the empty state message is shown with a reset button, and confirming clicking reset clears all filters and restores the full list.

**Acceptance Scenarios**:

1. **Given** no jobs match the active search keyword or filters, **When** the results are evaluated, **Then** the system displays a clear "No matching jobs found" message and suggests broadening search terms.
2. **Given** the empty state is displayed, **When** the candidate clicks the "Clear all filters" button, **Then** all filter inputs and query parameters are reset, and the full public job list is displayed.

---

### User Story 5 - Guest Access without Authentication (Priority: P1)

As a guest visitor, I want to explore and search all public job listings without being required to sign in, so that I can evaluate Launchly's opportunities before creating an account.

**Why this priority**: Reduces friction for top-of-funnel candidate acquisition; allows public search engine indexing.

**Independent Test**: Can be tested in an unauthenticated / incognito browser session by navigating to the job listing page and executing searches and filters.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they visit the job search page, **Then** they can view, search, and filter all approved public jobs without any login prompt or barrier.

---

### Edge Cases

- What happens when a user types special characters or punctuation in the keyword search? The system sanitizes and trims the query without breaking query execution.
- What happens when a user enters an out-of-range page number (e.g., page 999)? The system returns an empty list or gracefully clamps to the last available page without throwing a server error.
- What happens when an approved job belongs to a company whose moderation status is pending or rejected? The job MUST NOT appear in public results. Both job publication status and company moderation status must be verified server-side.
- What happens when a mobile user views the job list and filter panel? The layout must be responsive, avoiding horizontal scrolling or clipped filter options.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a public job search endpoint and discovery page accessible without user authentication.
- **FR-002**: System MUST filter results by career level (`INTERN`, `FRESHER`, `SENIOR`), industry category, and location.
- **FR-003**: System MUST support combining keyword search with any combination of level, industry, and location filters.
- **FR-004**: System MUST perform keyword searches matching either job title or company name.
- **FR-005**: Keyword searches MUST be case-insensitive and accent-tolerant for Vietnamese characters.
- **FR-006**: System MUST enforce server-side public listing rules: only jobs with publication status `PUBLISHED` and company moderation status `APPROVED` may be returned.
- **FR-007**: System MUST paginate job search results, providing metadata for current page, limit, total records, and total pages.
- **FR-008**: System MUST reflect all active filter parameters and pagination in the URL query string.
- **FR-009**: System MUST present a prominent empty state with a filter reset action when a query returns zero results.
- **FR-010**: Each job result card MUST display position title, company name, location, career level badge, and salary details (or "Negotiable" if undisclosed).

---

### Key Entities *(include if feature involves data)*

- **Job**: Represents a recruitment opportunity. Attributes include title, normalized title, career level, location, industry, salary minimum/maximum, requirements, benefits, and publication status.
- **Company**: Represents the employer organization. Attributes include company name, normalized company name, moderation status, and website.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Candidates can filter and find relevant jobs in under 3 clicks or within 5 seconds of interaction.
- **SC-002**: Unaccented Vietnamese queries achieve 100% recall against accented titles (e.g., searching "lap trinh" successfully returns "Lập trình viên").
- **SC-003**: 100% of non-published jobs (draft, pending, closed, rejected) and jobs from unapproved companies are excluded from public results.
- **SC-004**: Search and filter state survives page reload and URL sharing with 100% fidelity.

---

## Assumptions

- Job seekers on Launchly are predominantly early-career talents (interns and freshers), but senior roles may exist for specific partner companies.
- Industry, career level, and location values are governed by shared lookup sets across the system to maintain consistency between job creation and search filtering.
- Full job details, company profiles, and application submission are handled in downstream user stories (SCRUM-25, SCRUM-26, SCRUM-29).
