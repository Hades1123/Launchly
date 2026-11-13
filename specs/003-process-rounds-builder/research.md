# Research: Process Rounds Builder

## Decision 1: Replace-whole-list save

- **Decision**: One `PUT /jobs/:id/rounds` takes the full ordered list; array order becomes positions 1..n. Items may carry an existing round id.
- **Rationale**: Reordering, adding and deleting collapse into one atomic operation; the client never computes positions.
- **Alternatives**: per-round POST/PATCH/DELETE plus a reorder endpoint (more calls, partial states, order races).

## Decision 2: Unique-position safe reorder

- **Decision**: Inside the transaction, move kept rounds to temporary negative positions, then write final positions.
- **Rationale**: `@@unique([jobId, position])` is checked per row, so swapping 1 and 2 directly would collide.
- **Alternatives**: deferrable constraint (needs raw SQL and a schema change), deleting and recreating rounds (breaks application references).

## Decision 3: Serialise concurrent saves with a row lock

- **Decision**: `SELECT ... FOR UPDATE` on the job row at the start of the transaction.
- **Rationale**: Reproduced failure: 8 simultaneous saves collided on the unique index. Queued saves each re-read committed state.
- **Alternatives**: retry on unique violation (non-deterministic), serializable isolation (needs retry loops).

## Decision 4: Never delete a round that applications reference

- **Decision**: Lock the removed rounds, count applications pointing at them, refuse with 409 if any.
- **Rationale**: `Application.currentStageId` is `onDelete: SetNull`; deleting would silently clear a candidate's current step. Row locks make a concurrent application move finish first.
- **Alternatives**: allow and null the stage (violates SC-005), soft delete (extra column, out of scope).

## Decision 5: Format and duration storage

- **Decision**: `format` as nullable text validated by Zod against a fixed list; `estimatedDurationMinutes` as nullable integer. Both nullable so rounds that already exist without them stay valid.
- **Rationale**: Additive migration; no database enum to migrate when the list changes.
- **Alternatives**: Postgres enum (migration per change), free-text duration (cannot validate or sort).
- **Overlap**: the unpublished SCRUM-29 draft also proposes `JobStage.format`. Whichever lands second must not re-add the column.

## Decision 6: One validator for client and server

- **Decision**: `validateRoundDrafts` in `@launchly/shared` parses form drafts with `roundInputSchema` and reports offending fields.
- **Rationale**: Constitution I; makes client validation testable without a web test runner.
- **Alternatives**: hand-written client rules (drift risk, the first-pass review finding).

## Decision 7: Product defaults

- **Decision**: formats online, on-site, phone, assignment; duration 5 to 480 minutes; at most 10 rounds; name at most 100 characters.
- **Rationale**: The Jira ticket does not specify them. They are recorded as assumptions in the spec and need product confirmation.
