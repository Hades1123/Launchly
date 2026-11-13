# Feature Specification: Process Rounds Builder for Job Postings

**Feature Branch**: `feat/SCRUM-41-process-rounds-builder`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "SCRUM-41 Implement process rounds builder for job postings: ordered list of recruitment rounds with add, reorder, delete; each round stores name, format, estimated duration and explicit order index; required fields validated on submit." Parent: SCRUM-26 (Post a Job with Process and Notes).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define and Save the Hiring Process (Priority: P1)

As a recruiter, I want to build an ordered list of recruitment rounds for one of my job postings, giving each round a name, a format, and an estimated duration, so that candidates know what the hiring process looks like.

**Why this priority**: This is the core of the ticket. Without a saved, ordered list of rounds there is nothing to show candidates.

**Independent Test**: Sign in as the recruiter who owns a job, open its rounds page, add two rounds with all fields filled, save, reload the page, and confirm both rounds return in the same order with the same values.

**Acceptance Scenarios**:

1. **Given** a job with no rounds, **When** the recruiter adds a round with a name, a format, and a duration and saves, **Then** the round is stored as round 1 and shown again after a page reload.
2. **Given** a job with saved rounds, **When** the recruiter edits a round's name, format, or duration and saves, **Then** the changed values are stored and the order is unchanged.
3. **Given** a job with no rounds, **When** the recruiter opens the rounds page, **Then** an empty state invites them to add the first round.
4. **Given** a recruiter who does not own the job, or a candidate, **When** they try to view or change its rounds, **Then** access is refused and nothing is changed.

---

### User Story 2 - Reorder and Delete Rounds (Priority: P1)

As a recruiter, I want to move rounds up or down and remove rounds I no longer need, so that the list always reflects the real sequence of the process.

**Why this priority**: A process list is only useful if it can be corrected as plans change.

**Independent Test**: With three saved rounds, move the third round to the top, delete the middle one, save, reload, and confirm two rounds remain, in the new order, numbered 1 and 2.

**Acceptance Scenarios**:

1. **Given** several rounds, **When** the recruiter moves a round up or down, **Then** it swaps places with its neighbour and the round numbers update immediately.
2. **Given** the first round, **When** the recruiter looks at its controls, **Then** "move up" is unavailable. The same holds for "move down" on the last round.
3. **Given** a list of rounds, **When** the recruiter deletes one and saves, **Then** the remaining rounds keep their relative order and are renumbered without gaps.
4. **Given** a round that already has candidate applications attached to it, **When** the recruiter tries to delete it, **Then** the deletion is refused with a clear message and the list is unchanged.
5. **Given** a saved order, **When** the list is read back at any later time, **Then** the rounds appear in exactly the order the recruiter saved.

---

### User Story 3 - Required Fields Are Validated on Submit (Priority: P2)

As a recruiter, I want clear feedback when a round is incomplete or invalid, so that I never publish a process with blank or nonsensical rounds.

**Why this priority**: Protects data quality but depends on the builder from the first two stories.

**Independent Test**: Add a round, leave the name empty, leave the format unselected, enter a duration of 0, press save, and confirm each problem is flagged next to its field and nothing is stored.

**Acceptance Scenarios**:

1. **Given** a round with an empty or whitespace-only name, **When** the recruiter saves, **Then** the name field shows a required-field message and nothing is saved.
2. **Given** a round with no format chosen, **When** the recruiter saves, **Then** the format field shows a required-field message and nothing is saved.
3. **Given** a round whose duration is empty, not a whole number, or outside the allowed range, **When** the recruiter saves, **Then** the duration field shows a message stating the allowed range and nothing is saved.
4. **Given** several invalid rounds, **When** the recruiter saves, **Then** every invalid field is flagged at once, not one at a time.
5. **Given** a request that bypasses the page, **When** it contains invalid round data, **Then** the system rejects it with the same rules.

---

### Edge Cases

- A job with zero rounds is valid (the recruiter may clear the list and save).
- Saving more rounds than the maximum allowed is refused; the add control is disabled at the maximum.
- A name made only of spaces counts as empty; surrounding spaces are trimmed.
- Two rounds may share the same name; order, not name, identifies a round.
- A save that fails (network, session expiry) keeps the recruiter's edits on screen and shows an error.
- Two saves in quick succession must not leave duplicate or missing order numbers.
- Referencing a round that belongs to a different job is refused.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A recruiter MUST be able to add a round to a job they manage.
- **FR-002**: Each round MUST store a name, a format, an estimated duration in minutes, and an explicit order position.
- **FR-003**: The format MUST be chosen from a fixed list: online, on-site, phone, assignment.
- **FR-004**: Estimated duration MUST be a whole number of minutes between 5 and 480.
- **FR-005**: The name MUST be required, trimmed, and at most 100 characters.
- **FR-006**: A recruiter MUST be able to move a round up or down; the position of every round MUST be a gapless sequence starting at 1.
- **FR-007**: A recruiter MUST be able to delete a round, except one that candidate applications currently reference.
- **FR-008**: Saving MUST replace the job's whole round list with the submitted list in the submitted order.
- **FR-009**: Required fields MUST be validated when the recruiter submits, with every invalid field flagged at once, and the same rules MUST be enforced by the server.
- **FR-010**: Only the recruiter who created the job or who owns its company MUST be able to view or change its rounds; all other users are refused.
- **FR-011**: A job MUST hold at most 10 rounds.
- **FR-012**: Rounds MUST be returned in saved order whenever they are read.

### Key Entities

- **Job**: A posting owned by a company and created by a recruiter. It has an ordered list of rounds.
- **Round**: One step of the hiring process of a single job: name, format, estimated duration in minutes, and order position. Candidate applications may point at a round as their current step.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A recruiter can build and save a three-round process in under 2 minutes.
- **SC-002**: 100% of saved processes read back in exactly the order saved, with no gaps or duplicates in numbering.
- **SC-003**: 100% of incomplete or out-of-range submissions are rejected, and every offending field is identified in one attempt.
- **SC-004**: No user other than the job's managing recruiters can read or change its rounds.
- **SC-005**: No candidate application loses its current round as a side effect of editing the process.

## Assumptions

- Round format and duration are not defined by the ticket. The fixed format list and the 5 to 480 minute range are product defaults chosen here and can be changed.
- The builder is a standalone page for an existing job. The recruiter job create/edit flow and its navigation belong to sibling work under SCRUM-26.
- Showing rounds to candidates on the job detail page is covered by SCRUM-29 and is out of scope here.
- Company notes on a job (also under SCRUM-26) are out of scope.
- Reordering uses move up and move down controls; drag and drop is not required.
- Recruiters are already authenticated by the existing sign-in feature.
- The UI text is in Vietnamese, matching the existing auth and company pages.
