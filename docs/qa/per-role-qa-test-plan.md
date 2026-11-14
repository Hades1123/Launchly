# Per-role QA test plan

- Story: `SCRUM-89` (maintenance — Test the product per role and close e2e gaps)
- Related subtasks: `SCRUM-95` (web QA e2e specs and per-role test record), `SCRUM-96` (api test gaps)
- Demo test plan reference: [manual-e2e-demo-test-plan.md](manual-e2e-demo-test-plan.md)
- Gemini setup reference: [gemini-api-key-for-testing.md](gemini-api-key-for-testing.md)
- Output record file: [qa-record-2026-11-14.md](qa-record-2026-11-14.md)

## Role split

| Role | Assignee | Primary scope | AI driver required |
|---|---|---|---|
| `RECRUITER` | Van Nguyen Thien | Company registration/status, job CRUD/drafts, hiring rounds, applicant review | `mock` or `gemini` |
| `CANDIDATE` | Dung Nguyen Pham Manh | Auth flows, public job search, profile/CV, apply/tracking, CV fit check, interview practice | `gemini` (required for `C07`, `C08`, `N04`) |
| `ADMIN` | Vinh Nong The | Moderation access guards, company moderation queue, job moderation queue | `mock` or `gemini` |

## Prerequisites before testing

1. Sync with the latest `origin/main` (commit `d07997e` or newer, which includes PR #35 Wave 7 interview practice UI/history and the Gemini QA guide).
2. Prepare the local database and dependencies:
   - `pnpm install`
   - `pnpm db:up`
   - `pnpm db:migrate`
   - `pnpm db:seed`
3. For live AI cases (`C07`, `C08`, `N04`), inject your own key in `apps/api/.env` (`AI_DRIVER=gemini`, `GEMINI_API_KEY=<your_key>`) and verify with `pnpm --filter @launchly/api ai:smoke`. Never commit or share the key in chat or screenshots.
4. Start the app with `pnpm dev` (API on `http://localhost:4000`, web on `http://localhost:3000`). Use separate browser profiles or incognito windows when switching roles, or log out via the avatar menu (`Đăng xuất`).
5. Reset polluted local data before a clean pass with `pnpm db:reset` (local database only).
6. Record every result honestly as `passed`, `failed` (with bug details), or `not tested` (with reason). Do not mark blocked or unmerged features (`SCRUM-91` language switcher, Google sign-in without `GOOGLE_CLIENT_ID`) as `passed`.

---

## Section 1: Recruiter test plan (Van Nguyen Thien)

Primary accounts (password `Launchly@123`):
- Approved recruiter: `recruiter@launchly.test` (Nimbus Labs)
- Secondary approved recruiters: `recruiter.fpt@launchly.test`, `recruiter.lotus@launchly.test`
- Negative accounts: `recruiter.pending@launchly.test` (Draft Ventures, `PENDING`), `recruiter.rejected@launchly.test` (QuickCash Jobs, `REJECTED`)

| Case ID | Screen / route | Steps | Expected result |
|---|---|---|---|
| R01 | `/login`, header avatar menu, cross-role guards | Log in as `recruiter@launchly.test`. Open avatar menu (`Quản lý tuyển dụng`). Try visiting `/profile` and `/admin/moderation`. Sign out (`Đăng xuất`). | Redirects to `/jobs` after login; recruiter workspace opens; `/profile` and `/admin/moderation` block recruiter access cleanly. |
| R02 | `/company/register`, `/companies/[id]` | Open company registration form, inspect logo selection preview and submit validation, then view an approved public company page `/companies/<id>`. | Validation enforces required fields; check and log whether `URL.createObjectURL(file)` (`blob:...`) persists or breaks as logo URL (tracked as `Bug-3`). |
| R03 | `/recruiter/jobs` (pending/rejected company, `N11`) | Log in separately as `recruiter.pending@launchly.test` and `recruiter.rejected@launchly.test`, open `/recruiter/jobs` and try creating/submitting a job. | Sidebar reflects `PENDING` or `REJECTED` status; posting/submitting a job is blocked with an explanation (`Your company must be approved before you can post a job` from API). |
| R04 | `/recruiter/jobs` (list filters, pagination, delete drafts) | Filter by status tabs, keyword search, and level (`Intern`, `Fresher`, `Junior`, never `Senior`). Verify 10 items per page. Create temporary drafts, delete 1 draft with confirmation, then select and bulk-delete multiple drafts. Confirm `SUBMITTED`/`PUBLISHED` jobs have no delete action. | Filters, counts, and pagination match DB state; drafts delete only after confirmation; submitted/published jobs cannot be deleted. |
| R05 | `/recruiter/jobs/new` | Test validation by submitting with missing title/level. Test saving an empty or partial draft (`Lưu nháp`). Create a complete job: title, level, location, industry, description, skills, benefits, up to 5 notes (check 6th note blocked with `Maximum 5 notes`), and toggle `Lương thỏa thuận` vs min/max salary. Submit (`Gửi duyệt`). | Completeness bar updates; validation messages appear clearly; drafts remain hidden from public `/jobs`; submitted job moves to `Chờ duyệt`. |
| R06 | `/recruiter/jobs/[id]`, `/recruiter/jobs/[id]/edit` | Open a `SUBMITTED` or `PUBLISHED` job detail page (read-only). Open a `REJECTED` job (after Admin rejects one in `A05`), inspect rejection reason, edit it, and resubmit (`Sửa và gửi lại`). Also test accessing another recruiter's draft (`recruiter.fpt@launchly.test`). | Submitted/published jobs open read-only; rejected job displays admin reason and keeps history/resubmission clean; other recruiters' drafts are forbidden. |
| R07 | `/recruiter/jobs/[id]/rounds` | Open hiring rounds builder for a draft/editable job. Add rounds manually and via suggestion chips (`Gợi ý:`), test empty name/format validation, reorder rounds, change duration and format (`ONLINE`, `PHONE`, `ASSIGNMENT`, `ONSITE`), save, and reload. | Rounds persist in exact saved order and format; invalid empty name or missing format shows inline field errors. |
| R08 | `/recruiter/jobs/[id]/applicants` | Open applicants list for a job with applications (e.g. `Senior Frontend Engineer` or new demo job). Filter by application status. Click `Xem CV` to open PDF in a new tab. Open `Cập nhật`, test `Hủy`, then change status + target round + note (`Lưu thay đổi`). | Table displays candidates, skills, submission date, current round, status; PDF opens; status update succeeds with confirmation notice and updates applicant list. |

---

## Section 2: Candidate test plan (Dung Nguyen Pham Manh)

Primary accounts (password `Launchly@123`):
- Main candidate: `candidate1@launchly.test` (`nguyen-minh-anh-cv.pdf`, already applied to `Senior Frontend Engineer` and `Thực tập sinh Frontend React`, has 1 completed practice session)
- Secondary candidate: `candidate2@launchly.test` (`tran-quoc-bao-cv.pdf`)
- Negative accounts: `candidate.locked@launchly.test`, `candidate.unverified@launchly.test`

Note: run `C07`, `C08`, and `N04` with **`AI_DRIVER=gemini`** and a valid `GEMINI_API_KEY` in `apps/api/.env`.

| Case ID | Screen / route | Steps | Expected result |
|---|---|---|---|
| C01 | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Test `/login` wrong password (`N10`), locked account (`N08`), unverified account + `Gửi lại email xác minh` (`N09`), valid login + `Đăng xuất`. Test `/register` role radio (`Ứng viên` / `Nhà tuyển dụng`) + short/mismatched password errors. Test `/forgot-password`, `/reset-password` mismatch/invalid token, `/verify-email` missing/invalid token. | Vietnamese validation/error messages match rules cleanly; invalid/expired tokens show clear error states; logout returns header to logged-out state. |
| C02 | `/`, shared header & footer | Inspect landing page on desktop and narrow mobile viewport: hero search, latest jobs (at most 6), mobile menu open/close + `Escape`. Also verify header notification bell behavior (`Bug-2`). | Layout renders cleanly; log UI defect status for static `3` bell badge (`Bug-2`) and confirm no other header regression. |
| C03 | `/jobs`, `/jobs/[id]` | Test keyword search (with and without Vietnamese diacritics), level chips (`All Levels`, `Intern`, `Fresher`, `Junior`), industry dropdown, location dropdown, `Apply Filters`, `Reset`, unmatched query -> `No matching jobs found` -> `Clear all filters`, and `Previous` / `Next` pagination. Click job card for desktop side panel vs mobile `/jobs/[id]`. | Filtered results, URL parameters, pagination counts, hiring rounds display, and benefits match seeded jobs. |
| C04 | `/profile` (profile fields) | Check signed-out redirect and edit all fields (`Full name`, `Headline`, `Location`, `University or major`, `Bio summary`, add/remove skills, `Key projects`), save, and reload page. | All updated fields and skills persist across page reload; `Profile saved successfully.` shown. |
| C05 | `/profile` (CV upload/replace/delete) | On a clean candidate account without applications/assessments: test non-PDF rejection, upload PDF, `Download CV`, `Replace`, and `Delete`. Then test replacing/deleting a CV on an account that already submitted an application or AI assessment (use a disposable test account, never break `candidate1` before AI tests). | Unused CV upload/download/replace/delete succeeds. Replacing/deleting an already-referenced CV reproduces `Bug-1` (HTTP `500` + deleted physical file) unless already fixed in a separate ticket — record as `failed` referencing `Bug-1`. |
| C06 | `/jobs/[id]`, `/applications` | Test applying without a CV (`Upload a CV in your profile`, `N13`). Test applying again to `Senior Frontend Engineer` (`Applied` badge, `N12`). Apply with a valid CV and optional cover letter to an unused/newly approved published job (`C4`–`C5`). Open `Việc đã ứng tuyển` (`/applications`) and verify status badge + round timeline after recruiter updates it (`G1`–`G3`). | Duplicate application and missing-CV guards work; submitted application appears with status `SUBMITTED` and updates in timeline after recruiter transition. |
| C07 | `/cv-review` (`AI_DRIVER=gemini`, `Flow D`, `N01`, `N06`, `N14`) | Open `/cv-review` signed out (`N06` prompt). Sign in as `candidate1`: verify consent card appears on fresh DB (`D1`), test API consent enforcement (`N01`), click `I agree` (`D2`). Run `Analyse` against `Senior Frontend Engineer` and `Lập trình viên Backend Node.js` (`D4`–`D7`), and against pasted job description (`D8`). Check loading text, double-click prevention under Slow 3G (`N14`), score variation, >=3 suggestions, and exact quotes from CV. Temporarily test invalid `GEMINI_API_KEY` (`N04`), then restore valid key. | Real Gemini produces distinct, content-aware scores/gaps and verbatim CV quotes; `N04` displays `"The AI could not check your CV. Try again later."` with no fabricated score. |
| C08 | `/interview-practice`, `/interview-practice/[id]` (`AI_DRIVER=gemini`, `Flow E`, `N02`, `N03`) | Search `Senior Frontend Engineer`: inspect round tags (`Interactive` vs `Information only`). Test job with only `ASSIGNMENT`/`ONSITE` rounds (`N03`: `"This job has no round that can be practiced."`). Verify `Start practice` stays disabled until consent checkbox is ticked (`N02`). Run a single-round or full-workflow session: click `Generate questions` (5 questions with source badges `E6`), verify `Get feedback` stays disabled until all 5 answers are saved (`E7`–`E8`), compare feedback on short vs detailed answers (`E11`), complete all rounds for `Overall summary` (`E10`), and check `Practice history` `Resume` + pagination (`E12`). | Generated questions, source badges, answer save guards, feedback quality, overall summary, and history pagination all work with real Gemini output. |
| C09 | Cross-role access (`N05`) | Logged in as `candidate1@launchly.test`, navigate directly to `/recruiter/jobs` and `/admin/moderation`. | Access denied cleanly (`Khu vực dành cho nhà tuyển dụng` / `Bạn không có quyền duyệt nội dung.`). |

---

## Section 3: Admin test plan (Vinh Nong The)

Primary account (password `Launchly@123`):
- Admin: `admin@launchly.test` (Demo Admin)

| Case ID | Screen / route | Steps | Expected result |
|---|---|---|---|
| A01 | `/login`, `/admin/moderation` (`N05`) | Test visiting `/admin/moderation` while signed out and while signed in as `candidate1@launchly.test` or `recruiter@launchly.test`. Then log in as `admin@launchly.test` and open `Duyệt nội dung` from the avatar menu. | Non-admin roles are rejected (`Bạn không có quyền duyệt nội dung.`); admin lands on `/admin/moderation`. |
| A02 | `/admin/moderation`, `/admin/moderation/jobs` | Switch between tabs `Công ty` and `Tin tuyển dụng` (`Loại nội dung`). Check empty queue states when no pending companies or pending jobs remain (re-seed or test after clearing queues). | Tabs navigate cleanly and empty queues show appropriate empty-state copy without crashes. |
| A03 | `/admin/moderation/companies/[id]` | Open a pending company (`Draft Ventures`). Inspect fields and logo rendering (note `Bug-3` if logo is a broken `blob:` URL). Test `Từ chối` with empty reason, then valid reason; test `Duyệt` on another pending company (reset DB via `pnpm db:seed` / `pnpm db:reset` afterwards if mutating seeded Draft Ventures). Verify concurrency/already-decided state (reload or revisit handled company). | Reject confirm stays disabled until non-blank reason is entered; `Hủy` closes dialog; approved company moves out of pending queue and its recruiter can post jobs; already-decided company displays status without action buttons. |
| A04 | `/admin/moderation/jobs/[id]` | Open a pending job (submitted by Recruiter in `R05` or seeded/newly created pending job). Verify `Lương`, `Lĩnh vực`, `Email nhà tuyển dụng`, `Mô tả`, `Yêu cầu`, `Quyền lợi`, rounds in order, and notes (test both a job with notes and a job without notes). | All submitted job fields, rounds, and notes match what the recruiter entered; absent notes section is hidden cleanly. |
| A05 | `/admin/moderation/jobs/[id]` (`B5`, `N07`) | Reject one pending job with a reason (`Từ chối` -> `Lý do từ chối` -> `Xác nhận từ chối`) and confirm Recruiter sees the rejection reason (`R06`). Approve another pending job (`Duyệt`) and verify it disappears from queue and becomes visible in public `/jobs`. Also inspect a job already decided by another admin or after reload. | Rejected job returns to recruiter with exact reason; approved job goes `PUBLISHED` immediately on `/jobs`; decided jobs show status without action buttons and conflicts show an error cleanly. |

---

## Defect handling and record update rules

1. **Do not fix code bugs inside `SCRUM-89`** (`D2`). Any new defect uncovered during manual QA must be filed as its own `Story` ticket with label `bug`, containing: `Case ID`, `Role`, exact reproduction steps, expected vs actual result, and screenshot/log evidence.
2. **Baseline defects already observed in code/API checks** (do not duplicate unless attaching extra evidence from your role):
   - `Bug-1` (High/Critical): `CandidateService.deleteCv` / `uploadCv` replace deletes the PDF file from storage before Prisma throws `P2003` (`Application_resumeId_fkey` / `AiAssessment`), causing HTTP `500` on delete/replace and subsequent `GET /candidates/cv` downloads.
   - `Bug-2` (Low/Medium UI): `SiteHeader` renders a static `"3"` badge and non-functional bell button (`apps/web/src/components/layout/site-header.tsx`).
   - `Bug-3` (Medium UI/Persistence): `/company/register` passes browser-local `URL.createObjectURL(file)` (`blob:...`) as `logoUrl` (`apps/web/src/app/company/register/page.tsx`).
3. Once all three testers finish their assigned sections, merge the findings into the 3 role tables inside [qa-record-2026-11-14.md](qa-record-2026-11-14.md).
