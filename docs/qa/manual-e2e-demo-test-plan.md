# Manual E2E Test Plan: Demo Flow With AI

Purpose: walk the key demo flow by hand, as each role, and prove where AI is used.
Source of every label, account and rule: `main` at commit `ca3e265` (2026-11-14). Labels marked **(verify)** could not be confirmed from code and must be checked on screen. Record results in section 9.

The UI is mixed: auth, recruiter and admin pages are in Vietnamese, while CV check, interview practice and job-apply pages are in English. Labels below are written exactly as shown, with a gloss in brackets where needed.

## 1. Environment setup

| # | Step | Command / value | Expected |
|---|---|---|---|
| 1 | Start the database | `pn db:up` | Postgres on host port 5433 |
| 2 | Apply migrations | `pn db:migrate` | no errors |
| 3 | Load demo data | `pn db:seed` | seed completes; safe to rerun (idempotent) |
| 4 | Set the AI driver (see 1.1) | in `apps/api/.env` | see 1.1 |
| 5 | Start API and web | `pn dev` | API on `http://localhost:4000`, web on `http://localhost:3000` |
| 6 | Open the app | `http://localhost:3000` | landing page loads |

Reset before every demo rehearsal: `pn db:reset` (local database only). It wipes the data you created during the run.

### 1.1 AI driver: this decides whether the AI is visible

The API picks the AI by `AI_DRIVER` in `apps/api/.env`.

| `AI_DRIVER` | What it does | Use for |
|---|---|---|
| `mock` (default) | No network, no key. Returns the smallest schema-valid placeholder: text `mock`, score `0`. It does **not** analyse anything. | Automated tests only. **Do not use it to show AI to an audience.** |
| `gemini` | Calls the real Google Gemini API from the API server. | The demo and AI test cases. |

For the demo set:

```
AI_DRIVER=gemini
GEMINI_API_KEY=<your key>
# AI_MODEL is optional; the default is in apps/api/src/lib/env.ts
```

Then restart `pn dev:api`. Check the key and model before the demo with:

```
pn --filter @launchly/api ai:smoke
```

Expected: the script prints a real model reply. If it fails, fix this before testing anything in section 5.

## 2. Credentials

All seeded accounts use the same password: **`Launchly@123`** (local demo data only).

| Role | Email | Name | Use in demo |
|---|---|---|---|
| `ADMIN` | `admin@launchly.test` | Demo Admin | moderation (step 2) |
| `RECRUITER` | `recruiter@launchly.test` | Le Thu Ha | **main demo recruiter**, company Nimbus Labs (approved) |
| `RECRUITER` | `recruiter.fpt@launchly.test` | Pham Duc Long | company FPT Digital (approved) |
| `RECRUITER` | `recruiter.lotus@launchly.test` | Vo Ngoc Lan | company Lotus Finance (approved) |
| `RECRUITER` | `recruiter.pending@launchly.test` | Hoang Gia Huy | company Draft Ventures (PENDING), negative tests |
| `RECRUITER` | `recruiter.rejected@launchly.test` | Dang Van Khoa | company QuickCash Jobs (REJECTED), negative tests |
| `CANDIDATE` | `candidate1@launchly.test` | Nguyen Minh Anh | **main demo candidate**, frontend profile, CV `nguyen-minh-anh-cv.pdf` |
| `CANDIDATE` | `candidate2@launchly.test` | Tran Quoc Bao | backend profile, CV `tran-quoc-bao-cv.pdf` |
| `CANDIDATE` | `candidate.locked@launchly.test` | Locked Candidate | negative test: account locked |
| `CANDIDATE` | `candidate.unverified@launchly.test` | Unverified Candidate | negative test: email not verified |

Google sign-in needs `GOOGLE_CLIENT_ID`; skip it in the demo. Registering a new account needs an email catcher on SMTP `localhost:1025`; use seeded accounts instead.

## 3. Seed data cheat sheet

- **Demo CV text** (what the AI reads for `candidate1`): "Nguyen Minh Anh - Frontend Developer. Skills: React, TypeScript, HTML, CSS, Tailwind CSS, Git. Projects: Launchly clone job board UI with React and TypeScript; accessible design system with 20+ components."
- **Best job for AI demos:** `Senior Frontend Engineer` (Nimbus Labs, level JUNIOR, requirements React and TypeScript). Its three rounds are `Sàng lọc CV`, `Phỏng vấn kỹ thuật`, `Offer`, all format ONLINE, so all three are practicable.
- Other jobs: `Lập trình viên Backend Node.js` (rounds: CV screening ONLINE, Node.js test ASSIGNMENT, technical interview ONLINE, culture interview ONSITE) shows "Information only" rounds in practice.
- Already applied: `candidate1` applied to `Senior Frontend Engineer` (status INTERVIEW) and `Thực tập sinh Frontend React`. `candidate2` applied to `Senior Frontend Engineer`, `Lập trình viên Backend Node.js` (status SCREENING) and `Chuyên viên Phân tích Dữ liệu` (status REJECTED). Apply to a **new job created in step A** to avoid "already applied".
- `candidate1` has one completed practice session on `Senior Frontend Engineer`.
- AI consent is **not** seeded. Each fresh database shows the consent prompts.

## 4. Where AI is used in Launchly (explicit map)

| # | AI feature | Who | Where in the UI | What is sent to the AI | What comes back | Code |
|---|---|---|---|---|---|---|
| AI-1 | **CV fit check**: scores a CV against a job | `CANDIDATE` | Nav `Đánh giá CV` (`/cv-review`), button **Analyse** | Text extracted from the chosen PDF CV, plus the job title, description and requirements (or a pasted job description). No name, photo or contact details. | Score 0 to 100, what matches, what is missing (required vs nice to have), at least 3 suggestions, evidence quotes from the CV. Stored on the account. | `apps/api/src/modules/assessment/assessment.service.ts` |
| AI-2 | **Interview question generation** | `CANDIDATE` | Nav `Luyện phỏng vấn AI` (`/interview-practice`), button **Generate questions** | The job description, requirements and the chosen round's details. | Five written questions per round, each labelled with its source (job description, requirements, or interview round). | `apps/api/src/modules/interview-practice/interview-practice.service.ts` |
| AI-3 | **Round feedback and overall summary** | `CANDIDATE` | Same page, button **Get feedback** | The five questions and the candidate's saved answers. | Strengths, Things to improve, Next steps, and an Overall summary. | same service |

Common rules, all testable:
- AI runs only on the API server. The browser never calls Gemini, so the Network tab shows only `POST /api/...` calls to Launchly.
- A candidate must consent first. CV check uses the **AI consent** box (button **I agree**). Interview practice uses a separate checkbox on the start screen.
- The AI reply is validated against a schema. An invalid reply, a timeout (30 s) or an API error returns the message "The AI could not check your CV. Try again later." and stores a FAILED assessment. There are **no generic fallback answers**.
- A job with a blank description, no rounds, or no ONLINE or PHONE round cannot start practice, and no AI call is made.

### 4.1 How to prove it is real AI (use on stage)

| Proof | How to show it | Why it proves AI |
|---|---|---|
| Waiting time | Click **Analyse**: the page shows "Analysing your CV. This can take up to 30 seconds…" and takes seconds. **Generate questions** and **Get feedback** show their own progress text. | A database lookup would be instant. |
| Different input, different output | Run the CV check twice for the same CV against two different jobs (for example `Senior Frontend Engineer` and `Lập trình viên Backend Node.js`). Scores and the "What is missing" lists differ. | Output depends on content, not a fixed text. |
| Evidence from the CV | In **Evidence from your CV**, the quotes match real lines of the PDF (for example "Skills: React, TypeScript"). | The model read the file text. |
| Answers drive feedback | Write one very short answer and one detailed answer, then compare **Things to improve** and **Next steps**. | Feedback reacts to what was written. |
| Question sources | Each question shows a badge: "From the job description", "From the requirements" or "From the interview round". | Questions are generated from job data. |
| Server evidence | In the API terminal, with `AI_DRIVER=gemini`, requests to `/assessments` and the practice endpoints take several seconds. Optionally open `pnpm --filter @launchly/api exec prisma studio` and inspect the stored assessment (model `AiAssessment`: score, matched and missing skills, suggestions, evidence). | The result is stored from the AI reply. |
| Failure honesty | See TC-N04: remove the key, repeat, and show the error instead of a made-up result. | Proves nothing is faked. |

## 5. Main demo flow (run in this order)

Use two browser profiles or private windows so roles do not log each other out. Log out with the avatar menu, then **Đăng xuất**.

### Flow A: Recruiter posts a job with a hiring process

| ID | Step | Action (button or field, exact label) | Expected |
|---|---|---|---|
| A1 | Open the app | Go to `http://localhost:3000/login` | Heading **Đăng nhập** with fields **Email** and **Mật khẩu** |
| A2 | Log in | Email `recruiter@launchly.test`, password `Launchly@123`, click **Đăng nhập** | Redirected to `/jobs`; header shows avatar with initials "LT" |
| A3 | Open recruiter area | Click the avatar (aria label "Tài khoản Le Thu Ha"), then **Quản lý tuyển dụng** | `/recruiter/jobs`; sidebar shows company **Nimbus Labs** with an approved badge |
| A4 | Start a job | Click **Đăng tin mới** | New job form |
| A5 | Fill the form | **Vị trí tuyển dụng**: `Thực tập sinh Frontend Demo`. **Cấp bậc**: any. **Địa điểm**: pick one. **Ngành nghề**: pick one. **Mô tả công việc**: 3 to 4 sentences about React work. **Yêu cầu**: add `React`, `TypeScript`. **Quyền lợi**: add one. Salary: tick **Lương thỏa thuận** or fill min and max (USD per month). | Progress bar "Mức độ hoàn thiện để gửi duyệt" fills up |
| A6 | Optional notes | Click **Thêm ghi chú**, type a note (example text in UI: "Mang theo laptop khi phỏng vấn tại văn phòng.") | Note is listed |
| A7 | Save | Click **Lưu nháp** (draft), or **Gửi duyệt** if the form offers it **(verify)** | Job appears in the list as a draft or pending |
| A8 | Add hiring rounds | Open the job (**Xem chi tiết**), click **Sửa quy trình**. Click **Thêm vòng** three times, or use the **Gợi ý:** chips. Set: round 1 **Tên vòng** `Sàng lọc CV`, **Hình thức** Online, **Thời lượng (phút)** 30; round 2 `Phỏng vấn kỹ thuật`, Online, 45; round 3 `Phỏng vấn văn hóa`, Onsite, 30. Save. | Rounds listed in order. Online rounds are the ones AI practice can use. |
| A9 | Submit for review | Go back to the job and click **Gửi duyệt** (or **Sửa và gửi lại** for a returned job) | Status becomes "Chờ duyệt" (pending) |
| A10 | Log out | Avatar, **Đăng xuất** | Back to a logged-out header with **Đăng nhập** |

### Flow B: Admin approves the job

| ID | Step | Action | Expected |
|---|---|---|---|
| B1 | Log in | `admin@launchly.test` / `Launchly@123`, **Đăng nhập** | Logged in |
| B2 | Open moderation | Avatar, then **Duyệt nội dung** | `/admin/moderation`, queue tabs **Công ty** and **Tin tuyển dụng** (nav "Loại nội dung") |
| B3 | Open the job queue | Click **Tin tuyển dụng** | The new job `Thực tập sinh Frontend Demo` is listed |
| B4 | Review | Open the job | Shows **Lương**, **Lĩnh vực**, **Email nhà tuyển dụng**, **Mô tả**, **Yêu cầu**, **Quyền lợi** and the rounds |
| B5 | Approve | Click **Duyệt** | Notice shown; the job leaves the queue and becomes public |
| B6 | Log out | Avatar, **Đăng xuất** | |

Optional reject path (TC-N07): on a different pending job click **Từ chối**, type a reason in **Lý do từ chối**, click **Xác nhận từ chối** (the confirm button stays disabled until a non-blank reason is typed). **Hủy** closes the dialog.

### Flow C: Candidate finds the job and applies

| ID | Step | Action | Expected |
|---|---|---|---|
| C1 | Log in | `candidate1@launchly.test` / `Launchly@123`, **Đăng nhập** | Lands on `/jobs`; avatar initials "NM" |
| C2 | Search | Nav **Việc làm**, search `Frontend Demo` | The approved job appears |
| C3 | Open the job | Click the job card | `/jobs/<id>`: details, benefits, and the hiring process with each round's format and duration |
| C4 | Apply | Click **Apply** | A dialog opens with **Your CV** (preselected `nguyen-minh-anh-cv.pdf`) and **Cover letter (optional)** |
| C5 | Submit | Type a cover letter, click **Submit application** | The button now reads **Applied**, with the link **View my applications** |
| C6 | Check the list | Nav **Việc đã ứng tuyển** | The application is listed with status SUBMITTED and the hiring-round timeline |

If the candidate has no CV the page shows **Upload a CV in your profile** instead of the dialog.

### Flow D: AI feature 1, CV fit check (AI-1)

Precondition: section 1.1 set to `gemini`.

| ID | Step | Action | Expected |
|---|---|---|---|
| D1 | Open | Nav **Đánh giá CV** (`/cv-review`) as `candidate1` | If not consented: card **Before we check your CV** explaining that the CV text and job description go to an AI service and that name, photo and contact details are not sent |
| D2 | Consent | Click **I agree** | Card disappears; the check form shows |
| D3 | Pick the CV | **Your CV**: `nguyen-minh-anh-cv.pdf` | |
| D4 | Pick the job | **Compare against**: **A Launchly job**. In **Search a Launchly job by title…** type `Senior Frontend`, choose the result from **Job results**. (**Change job** resets it.) | Chosen job shown |
| D5 | Run the AI | Click **Analyse** | Button text **Analysing…**; page text "Analysing your CV. This can take up to 30 seconds…" |
| D6 | Read the result | Wait for **Analysis result** | Circular score gauge (aria label "Điểm phù hợp N trên 100"), sections **What matches**, **What is missing**, **How to improve** (at least 3 items), **Evidence from your CV** (quotes of CV lines) |
| D7 | Prove it is AI | Do section 4.1 "Different input" | Different scores and gaps for the Backend job |
| D8 | Pasted text mode | Repeat D5 with **A pasted job description**: paste any job text into **Paste the job description here…**, click **Analyse** | A result is shown for the pasted text |

Expected sanity: React and TypeScript appear under **What matches** for `Senior Frontend Engineer`; backend skills the CV lacks appear under **What is missing** for the Backend job.

### Flow E: AI features 2 and 3, interview practice (AI-2, AI-3)

| ID | Step | Action | Expected |
|---|---|---|---|
| E1 | Open | Nav **Luyện phỏng vấn AI** (`/interview-practice`) | Page with **Choose a job**; below it **Practice history** for this candidate |
| E2 | Pick the job | In **Job title or keyword** type `Senior Frontend`, click **Search**, choose `Senior Frontend Engineer` | Start screen with **Hiring process** listing rounds, each tagged **Interactive** or **Information only** |
| E3 | Choose scope | **What do you want to practice?**: **All interactive rounds** (full workflow) or one round (single round) | |
| E4 | Consent | Tick "I agree to send my answers to an AI service to generate practice questions and feedback." (separate from the CV consent) | **Start practice** becomes enabled; before ticking it is disabled |
| E5 | Start | Click **Start practice** | Session page opens, round list shows the first round; label shows **Full workflow** or **Single round** |
| E6 | AI generates questions | In the round panel click **Generate questions** | Button reads **Generating questions…** (up to about 30 s); then exactly **5 questions**, each with a badge ("From the job description", "From the requirements" or "From the interview round") |
| E7 | Answer | For each question type an answer in **Write your answer**, click **Save** | Each shows **Saved**. Editing again shows **Unsaved changes**. **Save** is disabled for empty or unchanged text. |
| E8 | Gate | Before all 5 are saved | Text "Save an answer to all five questions to get feedback." and **Get feedback** disabled |
| E9 | AI writes feedback | After all five are saved click **Get feedback** | Button reads **Writing feedback…**; then the round feedback with **Strengths**, **Things to improve**, **Next steps** |
| E10 | Next round | Continue with the next round (**Generate questions** again) until all interactive rounds are done | After the last round an **Overall summary** is shown |
| E11 | Prove it is AI | Do section 4.1 "Answers drive feedback" on a second round or session | Feedback differs between a short and a detailed answer |
| E12 | History | **Back to practice**, then **Practice history** | The session is listed. **Resume** continues an unfinished one; **Previous** and **Next** page the list; **Start your first practice** appears only for candidates with no sessions. |

Note: a session expires if left incomplete for 24 hours and is deleted by a cleanup job.

### Flow F: Recruiter reviews the applicant

| ID | Step | Action | Expected |
|---|---|---|---|
| F1 | Log in | `recruiter@launchly.test` / `Launchly@123` | |
| F2 | Open jobs | Avatar, **Quản lý tuyển dụng** | Job list with **Ứng viên** counts |
| F3 | Open applicants | On `Thực tập sinh Frontend Demo` click **Xem ứng viên** | Table with columns **Ứng viên**, **Kỹ năng**, **Ngày nộp**, **Vòng hiện tại**, **Trạng thái**, **Thao tác** |
| F4 | Filter | **Lọc theo trạng thái**, choose **Tất cả** or a status | List filters |
| F5 | Open the CV | Click **Xem CV** | The candidate's PDF opens in a new tab |
| F6 | Change status | Click **Cập nhật**. **Trạng thái mới**: pick the screening status (exact Vietnamese label **(verify)**). **Vòng (tùy chọn)**: pick round 1 or **Giữ nguyên**. **Ghi chú (tùy chọn)**: `Hồ sơ phù hợp`. Click **Lưu thay đổi** | Green message "Đã chuyển Nguyen Minh Anh sang ..."; row shows the new status. **Hủy** closes the form. |
| F7 | Log out | Avatar, **Đăng xuất** | |

### Flow G: Candidate sees the new status

| ID | Step | Action | Expected |
|---|---|---|---|
| G1 | Log in | `candidate1@launchly.test` / `Launchly@123` | |
| G2 | Open applications | Nav **Việc đã ứng tuyển** | The application shows the new status badge |
| G3 | Open the timeline | Click the application | **Status history** shows SUBMITTED then the new status with the note; **Hiring rounds** marks the **Current round** |

Language switch (planned): when SCRUM-91 ships, add a final step: header switcher to English, reload, confirm the choice persists. Not testable yet.

## 6. Negative and edge test cases

| ID | Case | Steps | Expected |
|---|---|---|---|
| N01 | CV check without consent | New database. As `candidate1`, `/cv-review`, do not click **I agree**, try to analyse | No form until consent; the API refuses with "Accept the AI consent before checking your CV" if called directly |
| N02 | Practice without consent | `/interview-practice`, pick a job, leave the checkbox empty | **Start practice** stays disabled |
| N03 | Job with no interactive round | Practice a job whose rounds are all ASSIGNMENT or ONSITE (create one in Flow A) | "This job has no round that can be practiced." and no AI call |
| N04 | AI unavailable | Stop the API, remove `GEMINI_API_KEY` (or set a wrong one), set `AI_DRIVER=gemini`, restart, run **Analyse** | Error text "The AI could not check your CV. Try again later." No score, no made-up result; run it again after restoring the key and it works |
| N05 | Wrong role | As `candidate1` open `/recruiter/jobs` and `/admin/moderation` | Recruiter page: "Khu vực dành cho nhà tuyển dụng" with link **Về trang việc làm**; admin page refuses with "Bạn không có quyền duyệt nội dung." |
| N06 | Candidate AI page logged out | Logged out, open `/cv-review` | "Log in to check your CV" |
| N07 | Admin rejects a job | See optional reject path in Flow B | Recruiter then sees "Tin đã bị quản trị viên từ chối." with the reason, and **Sửa và gửi lại** |
| N08 | Locked account | Log in as `candidate.locked@launchly.test` | Message "Tài khoản đang bị khóa. Vui lòng liên hệ bộ phận hỗ trợ." |
| N09 | Unverified account | Log in as `candidate.unverified@launchly.test` | Message about unverified account and the link **Gửi lại email xác minh** |
| N10 | Wrong password | Any account with a wrong password | "Email hoặc mật khẩu chưa chính xác." |
| N11 | Pending company | Log in as `recruiter.pending@launchly.test` | Sidebar shows the company as pending; posting a job is blocked or the job cannot go public **(verify the exact message)** |
| N12 | Duplicate application | As `candidate1` open `Senior Frontend Engineer` and apply | Already applied: **Applied** shown; direct duplicate returns "You have already applied to this job." |
| N13 | Candidate without CV | Register or use a profile with no CV, open a job | **Upload a CV in your profile** |
| N14 | Long AI wait | Throttle the network in browser DevTools to Slow 3G, run **Analyse** | Spinner text stays; no double submission; result still arrives or the AI error shows |

## 7. AI regression checklist (tick during every rehearsal)

- [ ] `AI_DRIVER=gemini` and `ai:smoke` passes.
- [ ] CV check shows a non-zero, job-specific score and real quotes (D6).
- [ ] Two different jobs give different results (D7).
- [ ] Five questions appear per round with source badges (E6).
- [ ] Feedback and overall summary appear after all rounds (E9, E10).
- [ ] Consent screens appear on a fresh database (D1, E4).
- [ ] An AI failure shows an honest error (N04).
- [ ] No contact details or name appear in the CV check text sent (inspect the stored assessment).

## 8. Known risks for the demo day

- SCRUM-62 (CV fit results with score bands) is still To Do; the current result screen already shows score, matches, gaps, suggestions and evidence, but not final band wording.
- SCRUM-68 and SCRUM-69 (text-only practice and history) must be merged before Flow E.
- A live key can fail on stage. Keep screenshots of a good D6 and E9 as a fallback, and rerun `ai:smoke` right before presenting.
- Reset data with `pn db:reset` before the demo so the demo job and application do not already exist.
- Language mixing (Vietnamese and English) in the UI is a known defect tracked in SCRUM-90.

## 9. Result record

| Test ID | Tester | Date | Build / commit | Result (Pass / Fail / Not tested) | Evidence (screenshot or note) | Bug ticket |
|---|---|---|---|---|---|---|
| A1 to A10 | | | | | | |
| B1 to B6 | | | | | | |
| C1 to C6 | | | | | | |
| D1 to D8 | | | | | | |
| E1 to E12 | | | | | | |
| F1 to F7 | | | | | | |
| G1 to G3 | | | | | | |
| N01 to N14 | | | | | | |

Every failed step becomes its own `bug` ticket with the step id, role, steps, expected result and a screenshot.
