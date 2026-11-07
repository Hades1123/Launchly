# Tasks: Salary Visibility Control for Public Job Data

**Input**: `specs/002-salary-visibility/` (spec, plan, research, data-model, contracts). Tests are required (constitution IV): write RED first, record the failure, then implement.

Already done on this branch: `Job.salaryHidden` + migration, `publicSalarySchema`, `toPublicSalary` (`apps/api/src/modules/job/job-salary.ts`).

## Phase 1: Foundational (blocks all stories)

- [x] T001 In `packages/shared/src/schemas/job.ts` replace `salaryMin`/`salaryMax` on `publicJobItemSchema` with `salary: publicSalarySchema`; add `jobIdParamsSchema = z.object({ id: z.string().uuid() })` and `publicJobDetailSchema` (id uuid, title, description, level, location, company `{id, name}`, salary) with `z.infer` types.
- [x] T002 [P] In `packages/shared/src/schemas/job.test.ts` add tests: item/detail accept hidden and visible salary, reject raw `salaryMin`-only shape via missing `salary`, `jobIdParamsSchema` rejects `'not-a-uuid'`.
- [x] T003 In `apps/api/src/modules/job/job.service.ts` extract the existing PUBLISHED + APPROVED-company filter into an exported `publicJobWhere` constant and use it in `searchJobs`.

## Phase 2: US1 + US2 - hidden / visible salary in search and detail (P1)

**Independent test**: with mocked Prisma, hidden job yields `salary {negotiable:true,min:null,max:null}` and serialized body lacks the stored figures; visible job yields the range; unset yields nulls.

- [x] T004 [US1] RED: extend `apps/api/src/modules/job/job.test.ts`: search fixture with `salaryHidden: true, salaryMin: 2000, salaryMax: 4000` expects `salary` negotiable and `JSON.stringify(body)` not matching `2000|4000`; visible fixture expects range; update existing fixtures with `salaryHidden: false`. Run `pnpm --filter @launchly/api test -- src/modules/job/job.test.ts`, record failure.
- [x] T005 [US1] GREEN: in `job.service.ts` map each item with `salary: toPublicSalary(job)` (drop raw `salaryMin`/`salaryMax`).
- [x] T006 [US2] RED+GREEN: add `getPublicJobById(id)` to `job.service.ts` using `findFirst({ where: { id, ...publicJobWhere }, select: { id, title, description, level, location, company: {select:{id,name}}, ...salarySelect } })`, mapping salary via `toPublicSalary`; throw `AppError('NOT_FOUND','Job not found')` when null. Add `getJob` handler to `job.controller.ts` and `router.get('/:id', validate({ params: jobIdParamsSchema }), controller.getJob)` to `job.routes.ts` (after `/`). Tests (T004 file): 200 body parses with `publicJobDetailSchema` for hidden and visible; body has none of `salaryMin`, `salaryMax`, `salaryHidden`, `publicationStatus`, `moderationReason`, `createdById`; `findFirst` called with the public `where`.

## Phase 3: US3 - unpublished jobs stay private (P2)

- [x] T007 [US3] Tests in `job.test.ts`: `findFirst` returns null gives 404 `NOT_FOUND` "Job not found" (`apiErrorSchema`); `GET /jobs/not-a-uuid` gives 400 `VALIDATION_ERROR` and `findFirst` not called.

## Phase 4: Web + docs + polish

- [x] T008 [P] Update `apps/web/src/app/(main)/jobs/page.tsx` (line ~74) and `apps/web/src/components/jobs/job-list-card.tsx` (`formatSalary`) to use `item.salary`: show "Negotiable" when `negotiable`, else the range as today.
- [x] T009 [P] Add section "Public job visibility" to `docs/Backend-Conventions.md`: public = PUBLISHED + APPROVED company via `publicJobWhere`; salary only via `toPublicSalary`; hidden jobs return `NOT_FOUND`.
- [x] T010 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`; record results (known pre-existing seed typecheck errors aside, check whether SCRUM-28 fixed them).

## Dependencies

T001 → T002, T004-T006. T003 → T005, T006. T004 → T005. T006 → T007. T008 needs T001. T010 last.

## Strategy

MVP = T001-T006 (no leak in search + detail). Then T007, T008-T009, T010.
