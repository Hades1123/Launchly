# Research: Search and Filter Jobs

## Decisions

### 1. Accent-tolerant and case-insensitive Vietnamese search

- **Decision**: Store lowercased, diacritic-stripped strings in dedicated database columns (`titleNormalized` on `Job`, `nameNormalized` on `Company`) indexed with standard B-tree indices. Strip diacritics from incoming search keywords at the API layer via a shared helper `normalizeVietnamese()`.
- **Rationale**:
  - Full compatibility with Prisma 7 and standard PostgreSQL B-tree indices.
  - Avoids writing brittle `$queryRaw` queries that bypass Prisma type safety and break dynamic query composition (combining with `industry`, `level`, `location`, and pagination).
  - Eliminates external dependencies on dedicated search clusters (e.g. Elasticsearch/Meilisearch) while satisfying 100% of the ticket's recall requirements for Vietnamese entry-level job titles.
- **Alternatives considered**:
  - PostgreSQL `unaccent` extension with `ILIKE` via `$queryRaw`: Bypasses Prisma type safety, makes pagination count calculation cumbersome and slow without trigram GIN indexes.
  - Client-side filtering: Infeasible for production datasets; violates the requirement to enforce public listing rules server-side.

### 2. Multi-criteria filter query composition

- **Decision**: Compose filter conditions dynamically into a single Prisma `AND` array on the server.
- **Rationale**:
  - Ensures all applied filters (`level`, `industry`, `location`, `keyword`) must be satisfied simultaneously (conjunction).
  - Easily isolates mandatory public visibility constraints from user-selected filters.
- **Filter mappings**:
  - `level`: Exact match against `JobLevel` enum (`INTERN`, `FRESHER`, `SENIOR`).
  - `industry`: Case-insensitive exact match against `Job.industry`.
  - `location`: Case-insensitive substring match against `Job.location`.
  - `keyword`: Disjunction (`OR`) checking unaccented keyword against `titleNormalized` and `nameNormalized`, as well as raw keyword against `title` and `name`.

### 3. Public listing rule enforcement

- **Decision**: Hardcode server-side filters requiring `publicationStatus = PUBLISHED` on `Job` and `moderationStatus = APPROVED` on related `Company`.
- **Rationale**:
  - Protects non-public drafts, pending moderation jobs, closed roles, and rejected companies from leaking into public search results.
  - Guarantees security and moderation compliance even if a guest or candidate manipulates client-side request parameters.

### 4. URL query state persistence and responsive UI

- **Decision**: Implement the filter panel as a standard HTML `<form method="GET" action="/jobs">` with Next.js Server Components, reading search parameters from `searchParams`.
- **Rationale**:
  - Native browser form submission automatically serializes inputs into URL query strings without requiring heavy client JavaScript.
  - Allows filtered links to be shared, bookmarked, and reloaded with 100% fidelity.
  - Server rendering delivers fast First Contentful Paint (FCP) and SEO indexing for public search crawlers.
