# Data Model: Admin Approves or Rejects Companies

## Company (changed)

| Field              | Type                                                          | Notes                                       |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------- |
| `moderationStatus` | `CompanyModerationStatus` (`PENDING`, `APPROVED`, `REJECTED`) | existing, default `PENDING`                 |
| `moderationReason` | `String?`                                                     | existing; set on reject, cleared on approve |
| `reviewedById`     | `String?` → `User.id`, `onDelete: SetNull`                    | **new**                                     |
| `reviewedAt`       | `DateTime?`                                                   | **new**                                     |
| `reviewedBy`       | relation `User` (`"CompanyReviewer"`)                         | **new**                                     |

State transitions (only these; anything else is a 409):

```text
PENDING ──approve──▶ APPROVED   (reason = null, reviewedById, reviewedAt)
PENDING ──reject───▶ REJECTED   (reason = <1..1000 chars>, reviewedById, reviewedAt)
```

Re-registration rule: a recruiter may create a Company only if none of theirs is `PENDING` or `APPROVED`. Their "own" company is the newest by `createdAt`.

## Job (changed, used by SCRUM-73)

| Field          | Type                                       | Notes                          |
| -------------- | ------------------------------------------ | ------------------------------ |
| `reviewedById` | `String?` → `User.id`, `onDelete: SetNull` | **new**, unused until SCRUM-73 |
| `reviewedAt`   | `DateTime?`                                | **new**                        |
| `reviewedBy`   | relation `User` (`"JobReviewer"`)          | **new**                        |

## User (changed)

Back-relations `reviewedCompanies Company[] @relation("CompanyReviewer")` and `reviewedJobs Job[] @relation("JobReviewer")`.

## Migration

`<timestamp>_moderation_review_audit`: `ALTER TABLE` adding two nullable columns, one FK and one index (`reviewedById`) per table. No data change; safe on populated databases.
