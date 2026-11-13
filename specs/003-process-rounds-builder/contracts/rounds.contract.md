# Contract: Job Rounds API

Base path (browser): `/api/jobs/:id/rounds` (rewritten to `/jobs/:id/rounds` on the API). Auth: `Authorization: Bearer <access token>`, role RECRUITER. Schemas live in `packages/shared/src/schemas/job-round.ts`.

## GET /jobs/:id/rounds

Returns rounds ordered by position.

200:
```json
{ "rounds": [{ "id": "uuid", "name": "Screening", "format": "PHONE", "estimatedDurationMinutes": 20, "position": 1 }] }
```

## PUT /jobs/:id/rounds

Replaces the whole list. Array order becomes positions 1..n.

Request:
```json
{ "rounds": [{ "id": "uuid (optional, existing round)", "name": "Screening", "format": "ONLINE", "estimatedDurationMinutes": 30 }] }
```

Rules: 0..10 rounds; name trimmed 1..100; format in ONLINE, ONSITE, PHONE, ASSIGNMENT; duration integer 5..480. Response: same shape as GET.

## Errors (shared `apiErrorSchema`)

| Status | Code | When |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | invalid params or body; unknown or duplicate round id |
| 401 | UNAUTHENTICATED / INVALID_SESSION | missing or bad token |
| 403 | FORBIDDEN | not a recruiter, or recruiter does not manage the job |
| 404 | NOT_FOUND | job does not exist |
| 409 | CONFLICT | a removed round is referenced by applications |
