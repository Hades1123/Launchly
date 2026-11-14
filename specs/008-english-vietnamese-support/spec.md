# Feature Specification: English and Vietnamese Language Support

**Jira**: SCRUM-91 https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-91 (Subtask SCRUM-98 web)

**Feature Branch**: `feat/SCRUM-91-english-vietnamese-support`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Jira Story SCRUM-91 "Add English and Vietnamese language support to the web app" and its web Subtask SCRUM-98, plus the scope decisions the user made on 2026-11-14 (see Decisions record).

## Clarifications

### Session 2026-11-14

- Q: Where should the language switcher appear, given that sign-in, recruiter and admin pages each have their own page frame without the main header? → A: In all four page frames (main header, sign-in/registration frame, recruiter workspace, admin header), so every page can switch.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the site language (Priority: P1)

A candidate who reads English better than Vietnamese opens Launchly, finds the language switcher in the header, and picks English. The site's shared text (header, language switcher, error messages, dates and numbers) changes to English straight away, without leaving the current page.

**Why this priority**: Without a switcher there is no way to reach English at all; every other story depends on it.

**Independent Test**: Open any page, pick English in the header switcher, and check that the page declares English as its language and that the switcher shows English as the current choice.

**Acceptance Scenarios**:

1. **Given** a visitor on any page, **When** they open the header switcher, **Then** they can choose between Vietnamese and English, and the current language is marked.
2. **Given** a visitor viewing the site in Vietnamese, **When** they choose English, **Then** the page stays on the same address and its language becomes English.
3. **Given** a visitor viewing the site in English, **When** they choose Vietnamese, **Then** the page language becomes Vietnamese.

---

### User Story 2 - The choice is remembered (Priority: P1)

A recruiter picks English once. When they reload, open another page, or come back later in the same browser, the site is still in English.

**Why this priority**: Picking the language on every visit or page would make the switcher useless in practice.

**Independent Test**: Choose English, reload the page and navigate to another page; both show English.

**Acceptance Scenarios**:

1. **Given** a visitor who chose English, **When** they reload the page, **Then** the page is still in English.
2. **Given** a visitor who chose English, **When** they open a different page, **Then** that page is in English.
3. **Given** a visitor who has never chosen a language, **When** they open any page, **Then** it is in Vietnamese.

---

### User Story 3 - Errors in the chosen language (Priority: P2)

A user signing in types the wrong password. The error message appears in the language they chose. When the server cannot be reached or answers with something unexpected, the generic message is also in their language.

**Why this priority**: An error the user cannot read blocks them; this matters most on sign-in and account pages, which every user passes through.

**Independent Test**: Choose English, sign in with a wrong password, and check that the error message is in English; repeat in Vietnamese.

**Acceptance Scenarios**:

1. **Given** a visitor viewing the site in English, **When** sign-in fails because of wrong credentials, **Then** the error message is in English.
2. **Given** a visitor viewing the site in Vietnamese, **When** sign-in fails because of wrong credentials, **Then** the error message is in Vietnamese.
3. **Given** any language, **When** the server returns an error kind the site does not specifically recognise, **Then** a generic error message in the chosen language is shown.

---

### User Story 4 - Dates and numbers in the chosen language (Priority: P3)

A recruiter looking at their job list or applicants sees dates and numbers written the way their chosen language writes them (for example month names and digit grouping).

**Why this priority**: Wrongly formatted dates are confusing but do not block anyone, so this follows the switcher and errors.

**Independent Test**: Open a page that shows a date (for example a public job detail), switch language, and check that the date is written in that language's format.

**Acceptance Scenarios**:

1. **Given** a page that shows a date, **When** the visitor switches from Vietnamese to English, **Then** the date is written in English format.
2. **Given** a page that shows a number with digit grouping, **When** the language changes, **Then** the grouping follows that language.

---

### Edge Cases

- **E1** First visit with no saved choice: Vietnamese.
- **E2** Reload after switching: the chosen language stays.
- **E3** A text has no English translation: the Vietnamese text shows; a raw technical key is never shown.
- **E4** The server returns an error: the message is in the chosen language; an unknown error kind shows a generic message in the chosen language.
- A saved choice holding a value other than Vietnamese or English (for example edited by hand): treated as no choice, so Vietnamese.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST support exactly two languages, Vietnamese and English.
- **FR-002**: Vietnamese MUST be the language for any visitor without a valid saved choice.
- **FR-003**: Every page MUST offer a language switcher with Vietnamese and English that shows the current language: in the main site header, the sign-in/registration frame, the recruiter workspace (on both desktop and mobile layouts), and the admin header.
- **FR-004**: Choosing a language MUST apply it to the current page without changing the page address, and to every page opened afterwards.
- **FR-005**: The choice MUST be remembered in the visitor's browser so it survives reloads and later visits, and MUST NOT require signing in.
- **FR-006**: Each page MUST declare its current language to browsers and assistive technology.
- **FR-007**: When a text has no translation in the chosen language, the Vietnamese text MUST be shown instead; a raw technical key MUST never be shown.
- **FR-008**: Every kind of error the server can report MUST have a message in both languages, plus one generic message for unknown kinds.
- **FR-009**: Errors shown on the sign-in, registration, password reset, email verification and Google link pages, and the site's own "cannot reach the server" and "invalid server response" messages, MUST appear in the chosen language.
- **FR-010**: Dates and numbers that pages already show MUST be formatted according to the chosen language.
- **FR-011**: Content entered by users or loaded from seed data (job titles, company names, descriptions) MUST NOT be translated.
- **FR-012**: The switcher MUST be usable with the keyboard alone, MUST have an accessible name that says it chooses the language, and MUST expose which language is currently selected.

### Key Entities

- **Language choice**: the visitor's preferred language, Vietnamese or English, kept in their browser; absent means Vietnamese.
- **Message catalogue**: the set of translatable texts, one entry per text in each language, grouped by area (shared texts, header, errors).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can switch the site language in at most 2 interactions from any page.
- **SC-002**: After choosing a language, 100 % of reloads and page navigations in the same browser keep that language.
- **SC-003**: 100 % of the server's error kinds have a message in both languages; no screen ever shows a raw technical key.
- **SC-004**: A first-time visitor sees Vietnamese on 100 % of pages.
- **SC-005**: Every date or number shown on pages changes format when the language changes.

## Assumptions

- Page body text (headings, labels, buttons) stays as it is today; translating it is SCRUM-92 and SCRUM-93. Only the header switcher, error messages, and dates and numbers change language in this Story.
- Pages that already use the sign-in error text (the admin moderation pages and the user menu's sign-out error) switch to the translated messages as well. All other pages keep showing the server's own error text until SCRUM-92 and SCRUM-93 move them to the shared messages.
- The choice is per browser, not per account; signing in on another browser starts in Vietnamese.
- Currency stays as it is shown today (salaries in US dollars); only the number format follows the language.
- No address changes: the same address serves both languages.

## Decisions record

Jira was intentionally not updated with these decisions (user, 2026-11-14); this section is the record.

- **D1** Vietnamese is the default (Story, user 2026-11-14).
- **D2** The choice is kept in the browser and applies to all pages (Story).
- **D3** Seed data is not translated (Story).
- **D4** Dates and numbers follow the chosen language and are in scope for this Story (user, 2026-11-14).
- **Error scope** A shared error-message lookup covering every error kind, used by the sign-in/account pages and by the site's own connection errors; other pages adopt it in SCRUM-92/93 (user, 2026-11-14).
- **Coverage gate** The changed-file coverage gate is waived for this Story because its command does not exist yet (user, 2026-11-14).
