# Quickstart: validate the admin moderation page

```bash
pn db:up && pn db:migrate && pn db:seed
pn dev
pnpm --filter @launchly/web test:e2e -- e2e/scrum-72-admin-company-moderation.spec.ts
```

Manual:

1. Sign in as `admin@launchly.test` (seed password). Account menu → "Duyệt nội dung".
2. Companies tab lists "Draft Ventures". Open it: details and owner email show.
3. "Từ chối" → dialog; confirm disabled until a reason is typed; confirm → "Bị từ chối" + reason, buttons gone.
4. Sign in as `recruiter.rejected@launchly.test` → `/recruiter/jobs` shows the reason and "Đăng ký công ty khác" → registration form.
5. As a recruiter, open `/admin/moderation` → "Khu vực dành cho quản trị viên".
