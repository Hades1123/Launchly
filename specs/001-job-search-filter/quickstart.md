# Quickstart: Search and Filter Jobs

## Prerequisites

- Node.js 22 LTS
- pnpm 12 (`pn`)
- Docker with PostgreSQL container running on port 5433

---

## 1. Start Database and Apply Migrations

```bash
# Start PostgreSQL container
pn db:up

# Apply committed Prisma migrations
pn db:migrate

# Load demo data (including verified companies and public jobs)
pn db:seed
```

---

## 2. Run Test Suite

```bash
# Run unit and integration tests for the job module
pn --filter @launchly/api test -- src/modules/job/job.test.ts

# Run shared Vietnamese diacritic normalization tests
pn --filter @launchly/shared test -- src/utils/vietnamese.test.ts

# Run repository-wide typecheck and linting
pn typecheck
pn lint
```

---

## 3. Verify in Development Browser

```bash
# Start development server
pn dev
```

1. Open `http://localhost:3000/jobs`.
2. Test searching for unaccented keywords like `lap trinh` to confirm it returns `Lập trình viên Backend Node.js`.
3. Test filtering by Career Level (select `Intern` or `Fresher`).
4. Test filtering by Industry (select `Technology` or `Marketing`).
5. Verify that the URL updates with query parameters and preserves filters when refreshing the page.
