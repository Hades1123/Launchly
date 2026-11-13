# Research: Admin Moderation Page for Companies

## R1. Guard

- **Decision**: client `AdminShell` using `useAuth()`: loading → "Đang tải…"; signed out → link to `/login?next=…`; non-admin → "Khu vực dành cho quản trị viên" with a link home. Same shape as `RecruiterShell` (`recruiter-shell.tsx:176-235`).
- **Rationale**: the app keeps the access token in memory (`lib/api/http.ts`), so server-side role checks are not available; the API enforces ADMIN anyway.
- **Note**: SCRUM-72 E3 says "sent away"; showing the guard card with a link matches the recruiter area and is testable.

## R2. Reject dialog

- **Decision**: native `<dialog>` with `showModal()`, labelled by its heading, textarea "Lý do từ chối", confirm disabled while `reason.trim()` is empty, Escape and "Hủy" close it. Pattern from `delete-draft-button.tsx`.

## R3. Conflict handling

- **Decision**: on `ApiError` code `CONFLICT`, reload the company with `getAdminCompany(id)` and show "Mục này đã được xử lý" above the decided state.

## R4. Queue data

- **Decision**: `listAdminCompanies('PENDING')` once on mount; no paging (API returns all).

## R5. Coverage

- `apps/web` has no Vitest and no `test:coverage`; e2e is the only web gate (same as Waves 1 to 3). Recorded in the PR.
