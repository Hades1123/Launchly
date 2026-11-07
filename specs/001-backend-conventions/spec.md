# Feature Specification: Backend Conventions and API Foundation

**Feature Branch**: `feat/SCRUM-33-backend-conventions`

**Created**: 2026-11-07

**Status**: Draft

**Input**: Jira SCRUM-33 — "Add backend conventions and API foundation" (parent epic SCRUM-7; blocks SCRUM-23). Define the conventions for `apps/api` and add the minimal foundation code that puts them into practice, so that authentication (SCRUM-23) and later feature modules reuse one error contract, one validation boundary, and one module shape.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consistent, safe error responses for API clients (Priority: P1)

An API client (the web app or any future consumer) makes a request that fails — invalid input, a conflict, an unknown route, a malformed or oversized body, or an unexpected server fault. In every case the client receives a response in a single, predictable error shape it can parse once and rely on, and the response never leaks internal implementation details such as stack traces, database errors, or secrets.

**Why this priority**: This is the core deliverable and the hard dependency for authentication (SCRUM-23), whose acceptance criteria need clear, distinguishable errors (wrong password, duplicate email, forbidden role). Without one shared contract every downstream module would invent its own, and leaking internals would violate the secure-by-default principle.

**Independent Test**: Issue failing requests of each category against the running API and confirm every response body validates against the shared error contract with the correct code and HTTP status, and that no server-fault response contains the original error message, a stack trace, or a secret.

**Acceptance Scenarios**:

1. **Given** a request that violates its input schema, **When** it is processed, **Then** the client receives a 400 response in the shared error shape with code `VALIDATION_ERROR` and per-field details.
2. **Given** a request to a route that does not exist, **When** it is processed, **Then** the client receives a 404 response in the shared error shape with code `NOT_FOUND` (not an HTML page).
3. **Given** a request whose body is malformed JSON, **When** it is parsed, **Then** the client receives a 400 `VALIDATION_ERROR` in the shared error shape.
4. **Given** a request body larger than the configured limit, **When** it is parsed, **Then** the client receives a 413 `PAYLOAD_TOO_LARGE` in the shared error shape.
5. **Given** an unexpected server fault carrying a sensitive message, **When** it is handled, **Then** the client receives a generic 500 `INTERNAL_ERROR` whose body contains no original message, stack trace, details, or secret.
6. **Given** any error response, **When** the client reads it, **Then** the body validates against the single shared error schema.

---

### User Story 2 - Reusable request-validation boundary (Priority: P1)

A backend developer building a feature route declares the expected body, route params, and query shape once and attaches a validation step so that controllers only ever run with already-validated, typed input, and invalid input is rejected uniformly before any business logic runs.

**Why this priority**: The shared-contracts principle requires validating body, params, and query at the request boundary before the controller. A single reusable validation mechanism is what makes that principle enforceable for every future module, including authentication.

**Independent Test**: Attach the validation step to test routes for body, params, and query; send valid and invalid inputs and confirm invalid input yields a 400 in the shared error shape with part-prefixed field paths, while valid input reaches the controller as typed, sanitized data with unknown keys removed.

**Acceptance Scenarios**:

1. **Given** a route validating a body schema and an invalid body, **When** the request arrives, **Then** it is rejected with 400 `VALIDATION_ERROR` and detail paths prefixed with the part name (e.g. `body` + field).
2. **Given** a route validating a query schema, **When** a valid query arrives, **Then** the controller receives the parsed, correctly typed query values.
3. **Given** a route validating route params, **When** an invalid param arrives, **Then** it is rejected with 400 `VALIDATION_ERROR` and a param-prefixed detail path.
4. **Given** a valid body with extra unknown keys, **When** it is validated, **Then** the controller receives the body without the unknown keys.
5. **Given** multiple request parts fail at once, **When** the request is validated, **Then** the response reports the issues from all failing parts together.

---

### User Story 3 - A reference module and documented conventions (Priority: P2)

A backend developer starting a new feature opens the written conventions and the existing health endpoint, used as the reference module, and follows one documented layout, naming scheme, layering rule, REST/JSON convention, error-handling rule, and testing approach — without changing the health endpoint's existing behaviour.

**Why this priority**: The conventions and reference module turn the foundation into a repeatable pattern, but they depend on the contract and validation boundary existing first, so they rank just below them.

**Independent Test**: Review the conventions document against the delivered symbols and paths, and confirm the health endpoint keeps its original path and response while being organised into the documented module shape.

**Acceptance Scenarios**:

1. **Given** the health endpoint, **When** a client calls it after the change, **Then** the path and response body are unchanged and validate against the existing health response contract.
2. **Given** the conventions document, **When** a developer reads it, **Then** every referenced symbol, path, status code, and rule matches the delivered code.
3. **Given** the repository guidance files, **When** a developer reads them, **Then** they reflect that colocated tests exist and that error responses go only through the shared error-raising mechanism or the validation step.

---

### Edge Cases

- A request with no body, or a non-JSON content type, against a route that expects a body → 400 with a body-level detail path.
- Multiple request parts (body, params, query) invalid in the same request → all issues returned together.
- Unknown/extra keys in an otherwise valid body → stripped, not an error.
- Non-standard internal path keys in validation details → normalized to strings.
- An unexpected server fault whose value is not a standard error object, or an explicitly-raised internal error → generic 500, no leak.
- A response whose headers were already sent when an error occurs → the error is delegated rather than re-sent.
- A 404 response still carries the standard security and CORS headers.
- Uncommon body-parser failures outside the defined set (e.g. unsupported media type, aborted request) → treated as a generic 500 (explicitly out of scope to map individually).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST define one shared error contract, reused by both the API and the web app, describing an error response as an object containing a machine-readable code, a human-readable message, and optional per-field details (each detail being a path plus a message). This contract MUST be the single source of truth; no module may redeclare it.
- **FR-002**: The shared error contract MUST enumerate a fixed set of foundation and authentication error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `UNAUTHENTICATED`, `INVALID_SESSION`, `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_LOCKED`, `EMAIL_ALREADY_REGISTERED`, `ACCOUNT_ALREADY_REGISTERED`, `INVALID_GOOGLE_IDENTITY`, `GOOGLE_SIGN_IN_UNAVAILABLE`, `INVALID_OR_EXPIRED_TOKEN`, `EMAIL_DELIVERY_FAILED`, and `INTERNAL_ERROR`; an unrecognized code MUST be rejected by the contract.
- **FR-003**: The system MUST map each error code to exactly one HTTP status (`VALIDATION_ERROR`→400, `UNAUTHORIZED`/`UNAUTHENTICATED`/`INVALID_SESSION`/`INVALID_CREDENTIALS`/`INVALID_GOOGLE_IDENTITY`→401, `FORBIDDEN`/`EMAIL_NOT_VERIFIED`/`ACCOUNT_LOCKED`→403, `NOT_FOUND`→404, `CONFLICT`/`EMAIL_ALREADY_REGISTERED`/`ACCOUNT_ALREADY_REGISTERED`→409, `PAYLOAD_TOO_LARGE`→413, `RATE_LIMITED`→429, `INVALID_OR_EXPIRED_TOKEN`→400, `EMAIL_DELIVERY_FAILED`/`GOOGLE_SIGN_IN_UNAVAILABLE`→503, `INTERNAL_ERROR`→500) and provide a single mechanism for raising a typed application error carrying a code, message, and optional details.
- **FR-004**: The system MUST centrally translate failures into the shared error shape: explicitly-raised 4xx application errors keep their code/status/message/details; the known auth-provider unavailability errors become 503 with their typed code/message; input-schema violations and malformed JSON bodies become 400 `VALIDATION_ERROR`; oversized bodies become 413 `PAYLOAD_TOO_LARGE`; everything else (including explicitly-raised internal errors and non-standard thrown values) becomes a generic 500 `INTERNAL_ERROR`.
- **FR-005**: Server-fault (500) responses MUST NOT expose the original error message, stack trace, detail list, or any secret; their body MUST contain only the generic code and a generic message. 4xx errors MUST NOT be logged; only 500-class faults are logged, and secrets MUST never be placed in logs or error messages.
- **FR-006**: Requests to unknown routes MUST return a 404 in the shared error shape with code `NOT_FOUND`, replacing the framework's default non-JSON 404.
- **FR-007**: The system MUST provide one reusable request-validation mechanism that validates any combination of request body, route params, and query against supplied schemas before the controller runs; on failure it MUST produce a 400 `VALIDATION_ERROR` whose detail paths are prefixed by the failing part name and MUST aggregate the issues of all failing parts; on success it MUST pass the parsed, typed, sanitized values (unknown keys removed) to the controller.
- **FR-008**: The health endpoint MUST be reorganised into the documented module shape and serve as the reference module, while preserving its existing path and response body (which continues to validate against the existing shared health-response contract).
- **FR-009**: The backend conventions MUST be documented, in English, covering: module layout and file naming; layering responsibilities (route → controller → service); REST/JSON conventions; the error-code-to-status table and when to use each; how to use the validation mechanism; the pagination convention (documented only); testing approach; and logging/security rules. Repository guidance files MUST be updated to stay consistent with the delivered code.
- **FR-010**: The API test suite MUST run successfully without a local environment file and without a database connection, so that these foundation behaviours are verifiable in isolation.
- **FR-011**: Every error-producing behaviour MUST be covered by automated tests following red → green, and each error test MUST assert the response body validates against the shared error contract.
- **FR-012**: The change MUST NOT introduce any new runtime or development dependency, and MUST stay within a bounded change size for the application and shared packages.

### Key Entities _(include if feature involves data)_

- **API Error**: The canonical error response. Attributes: a code from the fixed enumeration, a message, and an optional list of details. Carries no stack trace or internal data.
- **Error Detail**: One field-level problem within an error. Attributes: a path (the location of the offending field, including its request part) and a message.
- **Application Error**: An internally-raised, typed error carrying a code, the HTTP status derived from that code, a message, and optional details — the single way business code signals a failure.
- **Validation Target**: The set of request parts (body, params, query) a route validates, each with its own schema, used by the validation mechanism to produce typed, sanitized inputs or aggregated errors.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of error responses produced by the API (validation, not-found, malformed body, oversized body, conflict, and server fault) validate against the single shared error contract.
- **SC-002**: 0 server-fault (500) responses expose an original message, stack trace, detail list, or secret, verified by tests that assert the generic body and the absence of sensitive strings.
- **SC-003**: A new feature module can be added by following the documented conventions and reference module alone, with no undocumented decisions required for error handling, validation, layout, or testing.
- **SC-004**: The full local quality suite (typecheck, lint, tests) passes with no local environment file and no database, and the smoke test confirms a healthy endpoint, a JSON 404, and a 400 for a malformed body on the running API.
- **SC-005**: The change introduces 0 new dependencies (lockfile and manifests unchanged) and keeps the application + shared diff within the agreed bounded size.
- **SC-006**: 100% of specification requirements map to delivered code, at least one automated test, and the conventions documentation.

## Assumptions

- "Users" of this feature are API clients (primarily the web app and future consumers) and the backend developers who build on the conventions; there is no end-user UI change.
- The existing health response contract and login schema already defined in the shared package are reused as-is; this feature adds the error contract alongside them.
- The web app does not yet parse error bodies; wiring the web side to the shared error contract is deferred to when the first form ships.
- Authentication-specific error codes are part of the shared contract so auth and foundation routes produce client-parseable errors; rate limiting remains represented by `RATE_LIMITED`.
- Rate limiting, structured logging, authentication/role guards, request IDs, pagination code, and OpenAPI are explicitly out of scope and tracked as follow-ups; only `console`-level logging of server faults is used until a dedicated logging ticket lands.
- No change is made to environment validation, the database layer, the schema, Docker, or CI; there is currently no CI, so the local quality gates are the full suite.
- Uncommon body-parser failures outside the explicitly mapped set return a generic 500 by design.
