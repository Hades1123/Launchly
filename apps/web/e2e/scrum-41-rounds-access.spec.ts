import { expect, test } from '@playwright/test';

const JOB_ID = '00000000-0000-4000-8000-00000000040e';

test('AC4: a signed-out visitor is asked to sign in instead of seeing a spinner', async ({
  page,
}) => {
  await page.goto(`/recruiter/jobs/${JOB_ID}/rounds`);

  await expect(page.getByText('Vui lòng đăng nhập bằng tài khoản nhà tuyển dụng.')).toBeVisible();
  await expect(page.getByText('Đang tải quy trình…')).toHaveCount(0);
});
