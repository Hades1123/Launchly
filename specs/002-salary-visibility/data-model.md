# Data Model

**Job** (existing) gains `salaryHidden Boolean NOT NULL DEFAULT false` (migration `20261107120000_job_salary_hidden`).

**Public salary** (shared DTO): `{ negotiable: boolean, min: number|null, max: number|null }`. If `salaryHidden`: `{true, null, null}`; else `{false, salaryMin, salaryMax}`. Decimal → number.

**Public job detail** (shared DTO): `id (uuid), title, description, level (INTERN|FRESHER|SENIOR), location, company {id, name}, salary: PublicSalary`.

**Public visibility**: `publicationStatus = PUBLISHED` AND `company.moderationStatus = APPROVED`.

**Public job item (search)** changes: `salaryMin`/`salaryMax` replaced by `salary: PublicSalary`.
