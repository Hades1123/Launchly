# Recruiter applications API

Contract for the recruiter applicants page (SCRUM-60). Delivered by SCRUM-55. All shapes are Zod schemas in `packages/shared/src/schemas/application.ts`; the web app should parse replies with them and not redefine types.

From the browser the base path is `/api` (Next.js rewrite), for example `/api/jobs/:jobId/applications`. Every endpoint needs `Authorization: Bearer <access token>`.

A recruiter **manages a job** when they created it or own its company. Everything below is limited to jobs the caller manages.

## Status values

| Status      | Who sets it                          | Meaning                       |
| ----------- | ------------------------------------ | ----------------------------- |
| `SUBMITTED` | the system, when the candidate applies | starting state, not settable |
| `SCREENING` | recruiter                            | CV is being reviewed          |
| `INTERVIEW` | recruiter                            | interviewing                  |
| `OFFER`     | recruiter                            | offer made                    |
| `ACCEPTED`  | recruiter                            | candidate accepted            |
| `REJECTED`  | recruiter                            | not moving forward            |

`WITHDRAWN` exists in the data model but is not settable by a recruiter. A recruiter may set any of the five values from any current status, but never the status the application already has.

## GET /jobs/:jobId/applications

Role: `RECRUITER`. Lists the applicants of one job, newest first, no pagination.

Response `200` (`recruiterApplicationListSchema`):

```json
{
  "data": [
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "status": "SUBMITTED",
      "submittedAt": "2026-11-10T00:00:00.000Z",
      "candidate": { "name": "An Nguyen", "headline": "Junior dev", "skills": ["React", "Node.js"] },
      "resume": { "id": "…", "fileName": "cv.pdf" },
      "currentStage": { "id": "…", "name": "Screening" }
    }
  ]
}
```

`currentStage` is `null` when the job has no stages. `candidate.name` is an empty string when the candidate has not set a name.

Errors: `400` `jobId` is not a UUID · `401` no session · `403` caller is a candidate or does not manage the job · `404` job does not exist.

## PATCH /applications/:id/status

Role: `RECRUITER`.

Request body (`updateApplicationStatusSchema`):

```json
{ "status": "INTERVIEW", "stageId": "<uuid, optional>", "note": "<optional, max 1000 chars>" }
```

`stageId` must be a stage of the application's own job. When given, it becomes the application's current stage. Each successful call changes the status, optionally the stage, and adds exactly one history row (`fromStatus`, `toStatus`, `note`) in the same database update.

Response `200`: the updated applicant, same shape as one item of the list above (`recruiterApplicationSchema`).

Errors:

| Code | When                                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| 400  | `status` is not one of SCREENING, INTERVIEW, OFFER, ACCEPTED, REJECTED; `status` equals the current status; `stageId` is not a UUID or belongs to another job; `note` is too long; `id` is not a UUID |
| 401  | no session                                                                                 |
| 403  | caller is a candidate, or a recruiter who does not manage the job                          |
| 404  | application does not exist                                                                 |

Error bodies follow `apiErrorSchema` (`{ error: { code, message, details? } }`). `VALIDATION_ERROR` is the code for every `400` above.

## GET /applications/:id/resume

Roles: `RECRUITER` who manages the job, or the `CANDIDATE` who applied.

Response `200`: the CV file (`Content-Type` from the upload, `Content-Disposition: inline; filename="…"`). Open it in a new tab or fetch it as a blob with the bearer token.

Errors: `400` `id` is not a UUID · `401` no session · `403` any other user · `404` application does not exist.

## What the candidate sees

After a status change the candidate reads the new status and the history through `GET /applications/me` and `GET /applications/:id` (SCRUM-54). The history row written by this endpoint appears there ordered by `changedAt`.
