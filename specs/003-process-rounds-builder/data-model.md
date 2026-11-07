# Data Model: Process Rounds Builder

## JobStage (existing table, two new columns)

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | existing |
| jobId | uuid | existing; cascade delete with the job |
| name | text | existing; required, at most 100 chars at the API |
| description | text, nullable | existing; unused by this feature |
| position | int | existing; unique with `jobId`; 1..n gapless after every save |
| format | text, nullable | new; one of ONLINE, ONSITE, PHONE, ASSIGNMENT at the API |
| estimatedDurationMinutes | int, nullable | new; 5..480 at the API |

Relations: `Job 1..n JobStage`; `JobStage 1..n Application` through `Application.currentStageId` (`onDelete: SetNull`).

## Rules

- A job has 0 to 10 rounds.
- Positions after a save are exactly 1..n in submitted order.
- A round referenced by an application cannot be deleted through this feature.
- Rounds that predate this feature may have null format and duration; reads return them as null and the form requires them on the next save.

## Migration

`20261107120000_job_round_format_and_duration`: two `ADD COLUMN` statements, nullable, no data change. The folder name sorts after all existing migrations.
