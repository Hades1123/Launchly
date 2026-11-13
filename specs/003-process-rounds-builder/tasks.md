# Tasks: Process Rounds Builder for Job Postings

**Input**: `specs/003-process-rounds-builder/` (spec.md, plan.md, research.md, data-model.md, contracts/rounds.contract.md, quickstart.md)

**Tests**: Required (constitution IV). Every behaviour task is red → green: write the test, run it, record the failure caused by the missing behaviour (a compile or setup error is not RED), implement the minimum, record GREEN. Record evidence in the Evidence log at the bottom.

**Deliveries**: A = `feat/SCRUM-41-process-rounds-api` (T001–T012). B = `feat/SCRUM-41-process-rounds-web`, stacked on A (T013–T017). T018–T020 close the feature.

Format: `- [ ] ID [P?] [Story] description with file path`. Stories: US1 define and save, US2 reorder and delete, US3 validation.

## Phase 1: Setup (Delivery A)

- [ ] T001 Add nullable `format String?` and `estimatedDurationMinutes Int?` to `JobStage` in `apps/api/prisma/schema.prisma`; generate the migration with `prisma migrate dev --name job_round_format_and_duration`; rename the folder to `20261107120000_job_round_format_and_duration` so it sorts after every existing migration (update `_prisma_migrations` on the local database to match); confirm `prisma migrate deploy` applies all migrations to an empty scratch database; run `prisma generate`.

## Phase 2: Foundational (Delivery A)

- [ ] T002 [P] Write `packages/shared/src/schemas/job-round.test.ts` for the shared contract: name blank/whitespace rejected and trimmed, name 100 ok and 101 rejected, unknown format rejected, duration 4 and 481 and 30.5 rejected, 5 and 480 accepted, 0 and 10 rounds accepted and 11 rejected, `validateRoundDrafts` flags every invalid field of every draft at once and accepts `' 60 '`. Create `packages/shared/src/schemas/job-round.ts` with only stubs that return wrong values so the run fails on assertions. Record RED.
- [ ] T003 Implement `packages/shared/src/schemas/job-round.ts` per `contracts/rounds.contract.md`: `ROUND_FORMATS` ONLINE, ONSITE, PHONE, ASSIGNMENT; `roundInputSchema` (name trimmed 1..100, format enum, `estimatedDurationMinutes` integer 5..480, optional `id` uuid); `replaceRoundsSchema` (0..10 rounds); `jobIdParamsSchema`; `roundDtoSchema`; `roundsResponseSchema`; `validateRoundDrafts` built on `roundInputSchema`. Export from `packages/shared/src/index.ts`. Record GREEN.

## Phase 3: User Story 1 - Define and Save the Hiring Process (P1)

**Goal**: A recruiter who manages a job reads and replaces its rounds.
**Independent test**: PUT then GET returns the same rounds in the same order; non-owners and non-recruiters are refused.

- [ ] T004 [US1] Write `apps/api/src/modules/job/job-rounds.test.ts` (supertest, mocked Prisma): 401 without token, 403 for a candidate, 403 for a recruiter who does not manage the job, 404 for an unknown job, GET returns rounds ordered by position, PUT creates rounds and returns positions 1..n, PUT rejects a blank name, bad format and bad duration with 400 `VALIDATION_ERROR`, PUT with a round id from another job returns 400. Add route/controller/service stubs that respond wrongly so failures are assertion failures. Record RED.
- [ ] T005 [US1] Implement `apps/api/src/modules/job/job-rounds.service.ts` (owner check on creator or company owner; list; replace in one transaction), `job-rounds.controller.ts`, `job-rounds.routes.ts` (`authenticate`, `authorize('RECRUITER')`, `validate({ params, body })`), and mount the router under `/jobs` in `apps/api/src/app.ts`. Record GREEN.

## Phase 4: User Story 2 - Reorder and Delete Rounds (P1)

**Goal**: Saved order always equals submitted order with gapless positions; deleting a referenced round is refused.
**Independent test**: three rounds, reorder and delete, save: two rounds numbered 1 and 2 in the new order.

- [ ] T006 [US2] Extend `job-rounds.test.ts`: reorder existing rounds by id gives positions in array order; omitted rounds are deleted; deleting a round that applications reference returns 409 and deletes nothing. Record RED against the T005 service (which only creates).
- [ ] T007 [US2] Extend `job-rounds.service.ts` `replace`: validate ids belong to the job, park kept rounds on negative positions (unique `(jobId, position)`), delete removed rounds after the in-use count, then write final positions. Record GREEN.
- [ ] T008 [US2] Write `apps/api/src/modules/job/job-rounds.integration.test.ts` (gated by `RUN_DB_TESTS=1`, own PrismaClient, creates and removes its own user, company and job): create, reorder, edit, delete with gapless positions on a real database; refuse delete of a referenced round and keep the application's current round; refuse a non-owner. Run it against a disposable migrated database and record the result.
- [ ] T009 [US2] Write the concurrency test in `job-rounds.integration.test.ts`: 8 simultaneous saves of 3 rounds each must all succeed and leave positions `[1,2,3]` with names from a single request. Run against the T007 code and record RED (unique-constraint collisions).
- [ ] T010 [US2] In `job-rounds.service.ts` lock the job row with `SELECT ... FOR UPDATE` at the start of the transaction, and lock the removed round rows before the in-use count (research decisions 3 and 4). Add a `$queryRaw` stub to the unit-test mock. Record GREEN; run the concurrency test 3 times.

## Phase 5: User Story 3 - Required Fields Validated on Submit (P2)

**Goal**: Same rules in the form and on the server.
**Independent test**: a blank round, bad format and duration 0 are each flagged and nothing is stored.

- [ ] T011 [US3] Server side is covered by T004 and the shared tests by T002; add the missing coverage in `job-rounds.test.ts`: GET returns 403 for a non-owner, PUT with 11 rounds returns 400. Record RED if any case fails, otherwise record that the behaviour was already covered and why.

## Delivery A gate

- [ ] T012 Run `pn typecheck`, `pn lint`, `pn test`; run the gated integration test on a disposable database; commit in small commits `feat(db)`, `feat(shared)`, `feat(api)`, each with `SCRUM-41` in the subject; confirm the handwritten non-test, non-doc diff is near 300 lines or less.

## Phase 6: Web (Delivery B, stacked on A)

- [ ] T013 [US1] Create `apps/web/src/components/recruiter/rounds-builder.tsx` and `apps/web/src/app/recruiter/jobs/[id]/rounds/page.tsx`: load rounds with the access token, empty state, add round (disabled at 10), edit name, format and duration, save with `PUT`, show the saved list and a success or error message, keep edits when a save fails. Semantic design tokens only (`docs/Frontend-Conventions.md`).
- [ ] T014 [US2] In the builder: move up and move down (disabled on the first and last round), delete, round numbers follow position.
- [ ] T015 [US3] In the builder: on submit call `validateRoundDrafts` from `@launchly/shared` (no hand-written rules), flag every invalid field at once with Vietnamese messages, store nothing until valid.
- [ ] T016 Browser check on an isolated stack (scratch database, API on a spare port, web from a git worktree so the existing dev server is untouched): empty state, blank validation, save, reload, reorder, delete, and the database rows. Record the observations.
- [ ] T017 Run `pn typecheck`, `pn lint`, `pn test`; commit `feat(web): SCRUM-41 ...`.

## Phase 7: Polish

- [ ] T018 Run `speckit-analyze`; resolve every CRITICAL finding.
- [ ] T019 Run `review-implementation` in a session that did not write the code, on the final head commit of each delivery; fix every REJECTED finding and re-run on the new head.
- [ ] T020 Human steps (not for an agent): approve this plan, push, open the PRs titled `[SCRUM-41] ...` linking the Jira URL and SCRUM-26, add acceptance criteria to the Jira ticket, merge, move the ticket.

## Dependencies

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020. T002 can start in parallel with T001. T008 can be written alongside T006 but is run after T007.

## Implementation strategy

MVP is Phase 1–3 (save and read an ordered list). Phase 4 adds correctness under reordering, deletion and concurrency. The web delivery follows once the API is reviewed.

## Evidence log

Record per task: command, RED output (the failing assertion), GREEN output.

(Filled in during implementation.)
