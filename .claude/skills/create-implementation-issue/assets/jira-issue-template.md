---
# Jira fields read by publish-jira-issue. Values must come from the project configured in AGENTS.md.
jira_key: "{{JIRA_KEY}}"          # existing key (e.g. PROJ-123) or {{JIRA_KEY}} for a new ticket
project_key: "<!-- PROJECT KEY -->"
issue_type: "<!-- Story | Task | Bug | Epic | Subtask -->"
summary: "<!-- concise outcome, without the key -->"
parent: "<!-- parent epic/task key, or remove -->"
labels: []                         # e.g. ["api", "web"]; remove if unused
priority: "<!-- remove if the project does not use priority -->"
links: []                          # e.g. [{type: "Blocks", key: "PROJ-120"}]; remove if none
---

# <!-- [{{JIRA_KEY}}] concise outcome -->

<!-- Keep only relevant sections. Remove all comments before saving. Ensure the issue body is strictly bounded (<200 lines target, <=300 lines max, well under Jira's 32,000-character limit) and scoped to a single architectural domain to prevent agent token explosion. Use plain Markdown that Jira renders: headings, lists, tables, inline code, fenced code. No HTML. -->

## Objective and context

<!-- State the user-visible or operational outcome and why current behavior is insufficient. -->

## Delivery identity

- Jira: `[{{JIRA_KEY}}](https://<!-- site -->/browse/{{JIRA_KEY}})` <!-- `pending` until published -->
- Branch: `<!-- <type>/{{JIRA_KEY}}-<short-slug>. For a cloud agent limited to a platform-managed branch prefix: keep that branch (never instruct the agent to rename) and record the exception. -->`
- Commit format: `<!-- <type>(<optional-scope>): {{JIRA_KEY}} <summary>; every authored commit includes the key -->`
- PR title: `<!-- [{{JIRA_KEY}}] Concise outcome -->`
- PR description: `<!-- Include the Jira key and canonical Jira URL. -->`
- Jira status: `<!-- Who moves the ticket to In Progress / review / Done, and when. The agent does not transition unless granted here. -->`

## Evidence

<!-- Cite current-repository paths with lines. Prefix sibling paths with the repository name. Cite Jira tickets by key and Confluence pages by title + URL, quoting the text relied on. -->
<!-- Record branch and SHA for every repository used as evidence. Warn when a repository was not on or verified against live main, and record whether the user approved refresh or accepted snapshot-bound evidence. -->

Implementation issues must be fully self-contained. Do not rely on access to other
repositories, Jira tickets, or Confluence pages; links are for humans only.
Include complete, verbatim code snippets, exact configuration examples, and quoted
requirement text inline whenever adopting something from elsewhere.

## Confirmed decisions

<!-- Record decisions made during clarification, including rejected alternatives when material. -->

## Scope and non-goals

<!-- Define the smallest coherent scope and explicit exclusions. -->

## Existing architecture, reuse, and affected seams

<!-- Identify existing owners, types, helpers, packages, APIs, imports, test seams, deployment, and consumers. State what will be reused, what obsolete duplication/dead code is removed in scope, and justify any new abstraction or dependency. -->

## Contract symbols and package versions

<!-- For every consumed shared or external contract, declare the exact DTO/schema symbol names, package and version (or workspace package), and import path that implementation must use. Include runtime schema/validator symbols when applicable. -->

- Contract package and version: `<!-- @scope/name@x.y.z or workspace:* -->`
- DTO/schema symbols: `<!-- Exact exported symbol names -->`
- Import paths: `<!-- Exact package/module import paths -->`

## Proposed behavior, data flow, and performance

<!-- Describe the end-to-end flow and component responsibilities without speculative refactoring. For performance-sensitive work, state expected scale/hot paths, resource risks, and measurable regression evidence. -->

## Requirement-to-delivery traceability

| Requirement | Implementation task and seam | RED evidence | GREEN / final verification | Documentation |
|---|---|---|---|---|
| <!-- REQ-ID: precise outcome --> | <!-- Exact file/seam and ordered task --> | <!-- Focused test, command, and expected missing-behavior failure --> | <!-- Assertion, broader command, and required evidence --> | <!-- Exact file and content change, or N/A with reason --> |

## Contracts, validation, persistence, and migrations

<!-- Import or compose published shared-contract types, runtime schemas/validators, constants, and generated clients instead of recreating local DTOs/schemas. Static types do not replace runtime validation. Identify any missing upstream artifact or justified local adapter, including mapping tests. Define trust-boundary validation, ORM usage, and migration/compatibility needs. -->

## Edge cases, failure handling, concurrency, idempotency, rollback, and security

<!-- Keep only applicable normal/empty/boundary/invalid, production-failure, and trust-boundary requirements. -->

## Observability

<!-- For production behavior, prefer the established structured logger and tracing/metrics integration instead of creating a parallel stack. Define useful logs/spans and low-cardinality rate/error/latency/saturation metrics; exclude secrets, sensitive payloads, noisy per-item telemetry, and high-cardinality labels. Remove this section when not applicable. -->

## Required tests

<!-- Name exact files/seams, setup, commands, scenarios, and assertions. Cover happy plus relevant boundary/invalid/failure/regression paths and real boundaries that mocks cannot prove. -->

## TDD execution order

<!-- List dependency-ordered RED → GREEN → REFACTOR tasks. RED must capture the expected failure caused by missing behavior; GREEN is the minimum implementation plus targeted and broader checks; refactor only while green. -->

## Documentation, Confluence, deployment, and architecture

<!-- Make documentation explicit implementation tasks. Name exact files, required content, requirement mapping, and documentation validation. Update the owning existing spec and affected ADR/API/operational/configuration/example docs in the same change. Confluence pages without agent write access are human-owned follow-ups. Create a new spec only for a genuinely new requirement. -->

## Delivery mode and Spec Kit gate

<!-- State exactly one mode. Existing artifacts: link the approved spec.md, plan.md, tasks.md, reviewed PR, and remote ref; start at speckit-implement. Cloud bootstrap: the agent runs specify → clarify → plan → tasks → analyze, commits the artifacts to its PR branch, pauses for human approval, then resumes at speckit-implement without regenerating them. No-Spec-Kit maintenance: cite the repository policy that permits the behavior-preserving change, use acceptance criteria as the execution contract, do not reference nonexistent artifacts or run Spec Kit commands, and stop for reclassification if scope grows materially. In Spec Kit modes, stop/report material artifact mismatches instead of silently rewriting the contract. -->

## Cross-repository / cross-package dependencies and ownership

<!-- Name the owning repository or package, contract, sequencing, blocking Jira tickets, and work that blocks completion. -->

## Acceptance criteria

- [ ] <!-- Dependency-ordered, independently verifiable outcome. -->

## Definition of Done

- [ ] No test or validation checkbox may be marked complete unless its required command passed on the final revision; record exact command/output evidence and leave skipped, blocked, remote-only, or unexecuted checks incomplete.
- [ ] Terminal, non-retriable failures stop dependent work immediately, are reported with sanitized evidence and the required recovery action, and remain incomplete; retries are bounded and reserved for failures evidenced as transient.
- [ ] In case of terminal failure, circuit breaker, or threshold breach, current progress is committed as WIP and pushed to the remote branch (`wip: checkpoint before halt`) without discarding code or resetting working trees (`git reset --hard` forbidden); PR remains as Draft with a clear handover report.
- [ ] Handwritten code changes remain within the ≤300 line diff limit across 1–3 files (excluding generated assets and lockfiles), verified by CI when available or by `git diff --stat` otherwise.
- [ ] The complete documented local test/validation suite passes on the final revision, including required integration/E2E setup and commands: `<!-- exact commands and results -->`.
- [ ] Every CI-equivalent check available locally passes, and all required PR status checks are green on the final revision: `<!-- enumerate checks, or "no CI configured" -->`.
- [ ] Credential-gated, hosted-service, protected-environment, and other remote-only checks remain explicitly unchecked until their actual environment reports success.
- [ ] Relevant happy, boundary, invalid-input, failure, and regression scenarios pass at the appropriate unit/contract/integration/E2E seams; real boundaries are not replaced by mock-only evidence.
- [ ] Consumed contracts use the shared contract package's published types and runtime artifacts; any module-specific adapter has explicit mapping and conformance tests: `<!-- imports/artifacts/tests, or N/A -->`.
- [ ] Every in-scope `spec.md` requirement maps to implementation, tests, and current documentation; no requirement has missing or partial coverage: `<!-- paths, or N/A when Spec Kit does not apply -->`.
- [ ] Performance-sensitive changes include passing benchmark or before/after evidence against the stated scale or budget: `<!-- exact command/result, or N/A with reason -->`.
- [ ] Existing specs, ADRs, API/operational docs, examples, and configuration guidance are current for the delivered behavior; Confluence follow-ups are listed: `<!-- paths, or N/A with reason -->`.
- [ ] When Spec Kit applies, `tasks.md` reflects the delivered state honestly; blocked, deferred, human-only, and unverified requirements remain unchecked and prevent completion where required: `<!-- path, or N/A when Spec Kit does not apply -->`.
- [ ] The branch contains the Jira key (or keeps a recorded platform-managed cloud-agent prefix); every authored commit contains the key; the PR title contains the key and the PR description links the Jira URL.
- [ ] The required independent implementation review checks every confirmed requirement and acceptance criterion against the final diff and fresh evidence, then `review-implementation` returns `APPROVED` on the final head SHA with no unresolved Critical or Important findings. A `REJECTED` verdict includes prioritized, specific minimum-change remediation and is reviewed again after fixes.
- [ ] The Jira ticket moves to Done only after the accepted review verdict and a human merge.

## Incomplete follow-ups

- [ ] <!-- External, deferred, human-only, blocked, or unverified work that must not be claimed complete. -->
