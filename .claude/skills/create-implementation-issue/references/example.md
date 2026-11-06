# Example: focused retry behavior

Use this example for shape and precision only. Every path, command, requirement,
threshold, and design choice in a real issue must come from that repository's
evidence and approved requirements.

## Objective and non-goals

Retry transient order-export failures without producing duplicate exports.
Do not add a general retry framework, change permanent-error behavior, or redesign
the export pipeline.

## Confirmed requirements

- **R1:** Retry only errors classified as transient by the existing error model.
- **R2:** Preserve one idempotency key across all attempts.
- **R3:** Update the operator runbook and API retry semantics.
- **R4:** The no-failure path sustains 100 exports/s with no more than 5% throughput
  regression against the recorded baseline.

## Requirement-to-delivery traceability

| Requirement | Implementation task and seam                                                                             | RED evidence                                                                                                                                                 | GREEN / final verification                                                                                      | Documentation                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| R1          | Add the minimum retry decision at `src/exports/OrderExporter.ts`, reusing the existing error classifier. | Add `retries a transient failure once` to `tests/exports/OrderExporter.test.ts`; run the focused test and capture the assertion failure showing one attempt. | Run the focused test, exporter suite, and repository validation; assert two attempts and one successful result. | `docs/operators/order-export.md`: retryable classes, exhaustion, and troubleshooting. |
| R2          | Reuse the existing export key for every attempt; stop if the downstream boundary cannot enforce it.      | Add an ambiguous-success integration test that currently records two downstream exports.                                                                     | Assert one downstream export and the same key on every attempt.                                                 | `docs/api/order-export.md`: idempotency and ambiguous-outcome behavior.               |
| R3          | Complete the two documentation tasks above in the same implementation sequence.                          | Documentation review shows retry and idempotency behavior absent.                                                                                            | Run the repository documentation validation and verify both pages describe the delivered behavior.              | The two named files are the deliverables.                                             |
| R4          | Measure the unchanged success path before and after the smallest retry change.                           | Record the baseline command, environment, throughput, and p95 latency before implementation.                                                                 | Run the identical benchmark after GREEN; attach raw results and comparison.                                     | Record the supported load and benchmark command in the operator runbook.              |

## TDD execution order

1. **RED:** Add one focused R1 test, run it, and preserve the expected
   missing-behavior failure. Setup or compilation errors do not count.
2. **GREEN:** Implement only the R1 retry decision and run the focused test.
3. **RED/GREEN:** Repeat for R2 at the real export boundary.
4. **REFACTOR:** Remove duplication and improve names only while the focused and
   exporter suites remain green. Do not introduce Strategy/Factory abstractions;
   no approved variation requires them.
5. Complete R3 documentation tasks and their validation.
6. Run R4 before/after measurement and the complete documented validation suite.

## Example requested verdict

`REJECTED`

- **Important — R2 is not proven:** the draft checks attempt counts with a mock
  but has no real-boundary duplicate assertion. A retry after an ambiguous success
  could create two exports. Add the integration RED test described in the R2 row,
  require the same idempotency key across attempts, and make downstream idempotency
  support a stop condition.
- **Important — R3 is detached from implementation:** documentation appears only
  in Definition of Done. Add the two exact documentation tasks and validation from
  the traceability table before performance verification.

Recommended fix order: establish the R2 boundary test and stop condition, then add
the R3 documentation tasks. Run a fresh independent review after both edits.
