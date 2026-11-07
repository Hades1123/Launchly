# Data Model: Search and Filter Jobs

## Job

Represents a job listing posted by a recruiter on Launchly.

| Field | Type | Constraints and Purpose |
|---|---|---|
| `id` | String | UUID primary key. |
| `companyId` | String | Foreign key referencing `Company.id` (onDelete: Restrict). |
| `createdById` | String | Foreign key referencing `User.id` (recruiter author). |
| `title` | String | Display position title (e.g., "Lập trình viên Frontend"). |
| `titleNormalized` | String, nullable | Diacritic-free, lowercased title for fast accent-tolerant search (indexed). |
| `description` | String | Full markdown job description. |
| `level` | `JobLevel` | Enum: `INTERN`, `FRESHER`, `SENIOR` (indexed). |
| `location` | String | Workplace city/region or "Remote" (indexed). |
| `industry` | String, nullable | Standard industry category (indexed, e.g. "Technology", "Design"). |
| `requirements` | String[] | Key requirements and skill keywords. |
| `benefits` | String[] | Perks and compensation offerings. |
| `salaryMin` | Decimal, nullable | Lower bound of compensation range. |
| `salaryMax` | Decimal, nullable | Upper bound of compensation range. |
| `publicationStatus` | `JobPublicationStatus` | `DRAFT`, `PENDING`, `PUBLISHED`, `CLOSED`, `REJECTED` (indexed). |
| `createdAt`, `updatedAt` | DateTime | Timestamps for sorting and auditing. |

### Indexes

- `@@index([companyId])`: Foreign key traversal.
- `@@index([createdById])`: Author ownership queries.
- `@@index([publicationStatus])`: Public listing gate filter.
- `@@index([industry])`: Filtering by industry.
- `@@index([level])`: Filtering by career level.
- `@@index([location])`: Filtering by location.
- `@@index([titleNormalized])`: Fast text substring matching on normalized title.

---

## Company

Represents the employer organisation posting jobs.

| Field | Type | Constraints and Purpose |
|---|---|---|
| `id` | String | UUID primary key. |
| `ownerId` | String | Foreign key referencing `User.id`. |
| `name` | String | Formal company name (e.g., "Nimbus Labs"). |
| `nameNormalized` | String, nullable | Diacritic-free, lowercased name for keyword search (indexed). |
| `description` | String, nullable | Company overview and mission. |
| `website` | String, nullable | External link to employer website. |
| `moderationStatus` | `CompanyModerationStatus` | `PENDING`, `APPROVED`, `REJECTED` (indexed). |
| `createdAt`, `updatedAt` | DateTime | Timestamps. |

### Indexes

- `@@index([ownerId])`: Recruiter ownership.
- `@@index([moderationStatus])`: Enforcing approved company requirement on public listings.
- `@@index([nameNormalized])`: Fast company name search matching.
