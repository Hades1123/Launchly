# Research: Salary Visibility

- **Decision**: `salaryHidden Boolean @default(false)` on `Job`. **Rationale**: simplest per-job recruiter choice; stored figures survive un-hiding. **Alternatives**: nulling salary on hide (loses data); separate table (overkill).
- **Decision**: hidden salary returns `{negotiable: true, min: null, max: null}`; client renders "Negotiable". **Rationale**: no localized string in API, no real value. **Alternative**: literal "Negotiable" string (mixes types, harder to type).
- **Decision**: one `publicJobWhere` (PUBLISHED + company APPROVED) exported from the job service (extracted from the existing search `where`); 404 `NOT_FOUND` for every non-public case. **Rationale**: single rule for detail and search, no existence leak. **Alternative**: 403 for hidden jobs (leaks existence).
- **Decision**: Prisma `select` whitelist, salary only via `toPublicSalary`. **Rationale**: new columns cannot leak by default.
- **Decision**: detail DTO limited to id, title, description, level, location, company, salary. Rounds/notes deferred to SCRUM-29 to avoid overlapping work; SCRUM-29 extends the same schema.
