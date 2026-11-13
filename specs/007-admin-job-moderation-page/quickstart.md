# Quickstart: validate the admin job moderation page

```bash
pn db:up && pn db:migrate && pn db:seed && pn dev
pnpm --filter @launchly/web test:e2e -- e2e/scrum-74-admin-job-moderation.spec.ts
```

Manual:

1. As `recruiter.fpt@launchly.test`, submit a job with two rounds and two notes.
2. As `admin@launchly.test`: "Duyệt nội dung" → "Tin tuyển dụng" → the job is listed with company, level and date.
3. Open it: details, rounds in order with format and duration, notes in order.
4. Reject with a reason → "Bị từ chối" + reason. As the recruiter, fix and resubmit; as admin, the job shows "Đã từ chối trước đó" with the reason.
5. Approve → "Đã duyệt"; `/jobs/<id>` opens for candidates.
