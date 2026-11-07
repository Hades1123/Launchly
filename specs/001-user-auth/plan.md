# Implementation Plan: User Authentication and Authorization

**Branch**: `feat/SCRUM-23-authentication` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-user-auth/spec.md`

## Summary

Implement the API authentication foundation for SCRUM-23: validated registration and account verification, password and Google sign-in, session and refresh-token handling, password recovery, account-lock enforcement, and server-side role authorization. Keep user-facing contracts in `@launchly/shared`, business logic in the API auth service, and external mail and Google integrations behind providers. Persist verification/reset credentials and refresh sessions as hashes so tokens can be single-use, expired, and revoked.

## Technical Context

**Language/Version**: TypeScript on Node.js 22 LTS  
**Primary Dependencies**: Existing Express 5, Prisma 7, Zod 4, Vitest, Supertest; add `jsonwebtoken`, `google-auth-library`, `nodemailer`, `@aws-sdk/client-sesv2`, and `express-rate-limit` for their specific auth and provider responsibilities. Add `@types/jsonwebtoken` and `@types/nodemailer` for TypeScript. Use Node.js `crypto.scrypt` for password hashing.  
**Storage**: PostgreSQL via Prisma 7.  
**Testing**: Vitest and Supertest; inject auth-service and provider dependencies so API and business rules can be tested without live SMTP, Google, or database credentials.  
**Target Platform**: Node.js 22 API service.  
**Project Type**: pnpm monorepo; Express REST API and source-only shared contracts.  
**Performance Goals**: No workload or latency SLO is specified. Keep password derivation asynchronous and bound rate-limited auth operations.  
**Constraints**: Preserve route → controller → service → Prisma layering; validate contracts with shared Zod schemas; do not expose Prisma records; issue short-lived JWT access tokens and opaque refresh tokens in httpOnly cookies; require email confirmation before linking non-Gmail/non-Workspace Google identities to existing accounts; do not migrate on startup or edit committed migrations; keep secrets in the API environment; protect logout and password reset by revoking persisted sessions.  
**Scale/Scope**: One authentication module serving the existing User model and all current roles; no frontend pages, admin lock-management UI, other social login, or two-factor authentication.

## Constitution Check

| Principle | Gate | Plan |
|---|---|---|
| I. Shared Contracts First | Pass | Define request and response schemas in `packages/shared`; derive API types from them and validate route input before controller/service work. |
| II. Layered Modular Monolith | Pass | Place auth routes, controllers, and services in `apps/api/src/modules/auth/`; put SMTP/SES and Google verification behind provider interfaces. |
| III. Secure by Default | Pass | Use scrypt password hashes, hashed one-time tokens, Google ID-token verification, short-lived JWT access tokens, revocable persisted sessions, secure cookies, rate limits, and role guards. |
| IV. Tested Business Logic | Pass | Add tests for shared schemas, service success/failure paths, provider failures, token expiry/reuse, auth middleware, and role denial. |
| V. Safe Data Evolution | Pass | Add a forward-only Prisma migration for verification state, locks, tokens, and sessions; do not edit the existing migration or migrate at API startup. |
| VI. Simplicity and Pinned Dependencies | Pass | Add only dependencies directly needed for JWT, verified Google identity, SMTP/SES delivery, and request throttling; use Node crypto for password hashing and token generation. |

**Pre-design gate**: PASS. No constitution violations require an exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth.openapi.yaml
├── checklists/
│   ├── requirements.md
│   └── api-security.md
└── tasks.md
```

### Source Code

```text
packages/shared/src/
├── schemas/
│   └── auth.ts
└── index.ts

apps/api/prisma/
├── schema.prisma
└── migrations/
    └── <new-auth-migration>/

apps/api/src/
├── app.ts
├── lib/
│   └── env.ts
├── middlewares/
│   ├── authenticate.ts
│   ├── authorize.ts
│   └── error-handler.ts
├── modules/auth/
│   ├── auth.routes.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.service.test.ts
├── providers/
│   ├── google/
│   └── mail/
└── tests/
    └── auth.routes.test.ts
```

**Structure Decision**: Use the existing monorepo and module conventions. The auth feature owns its API contracts, service logic, routes, and guards; shared Zod schemas remain in the source-only shared package. Provider implementations are isolated from the auth service.

## Phase 0: Research

See [research.md](./research.md). Research decisions cover password hashing, access/refresh tokens, Google identity verification, email drivers, and throttling. No unresolved technical unknowns remain.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): account verification/locking state, one-time auth tokens, and revocable refresh sessions.
- [API contract](./contracts/auth.openapi.yaml): registration, verification, login/logout, Google sign-in, token refresh, password recovery, and current-user routes.
- [Quickstart](./quickstart.md): local setup and end-to-end validation scenarios.

## Post-design Constitution Check

| Principle | Gate | Design evidence |
|---|---|---|
| I. Shared Contracts First | Pass | The OpenAPI shapes map to shared Zod request/response schemas; Prisma types remain private to API services. |
| II. Layered Modular Monolith | Pass | External mail and Google calls are behind provider interfaces and do not enter controllers or Prisma-facing business rules. |
| III. Secure by Default | Pass | The data model stores only token hashes; each access token names a persisted session that is checked for revocation; refresh cookies are httpOnly; authorization is server-side. |
| IV. Tested Business Logic | Pass | Quickstart and test plan cover user journeys, invalid/expired/reused credentials, provider failures, and forbidden roles. |
| V. Safe Data Evolution | Pass | The new migration only adds fields/tables and indexes; existing migration history remains unchanged. |
| VI. Simplicity and Pinned Dependencies | Pass | Dependencies map to concrete requirements; no new service or frontend application is introduced. |

**Post-design gate**: PASS. No unjustified complexity or constitution violations.

## Complexity Tracking

No constitution violations.
