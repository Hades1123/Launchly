import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

const API_DIR = path.resolve(__dirname, '../../api');
const CV_FIXTURE = path.resolve(API_DIR, 'src/modules/candidate/__fixtures__/cv-en.pdf');
const QA_EMAIL = 'qa.profile@launchly.test';

function runApiScript(code: string) {
  execFileSync('node', ['--import', 'tsx', '-e', code], {
    cwd: API_DIR,
    stdio: 'pipe',
  });
}

function ensureQaCandidate() {
  runApiScript(`
    import 'dotenv/config';
    import { prisma } from './src/lib/prisma.ts';
    async function main() {
      const seedUser = await prisma.user.findUnique({ where: { email: 'candidate1@launchly.test' } });
      if (!seedUser?.passwordHash) throw new Error('Seed user missing');
      const existing = await prisma.user.findUnique({ where: { email: '${QA_EMAIL}' } });
      if (existing) {
        const profile = await prisma.candidateProfile.findUnique({ where: { userId: existing.id } });
        if (profile) {
          await prisma.resume.deleteMany({ where: { candidateId: profile.id } });
          await prisma.candidateProfile.deleteMany({ where: { id: profile.id } });
        }
        await prisma.user.delete({ where: { id: existing.id } });
      }
      await prisma.user.create({
        data: {
          email: '${QA_EMAIL}',
          passwordHash: seedUser.passwordHash,
          fullName: 'QA Profile Candidate',
          role: 'CANDIDATE',
          emailVerifiedAt: new Date(),
        },
      });
    }
    main().finally(() => prisma.$disconnect());
  `);
}

function cleanupQaCandidate() {
  runApiScript(`
    import 'dotenv/config';
    import { prisma } from './src/lib/prisma.ts';
    async function main() {
      const user = await prisma.user.findUnique({ where: { email: '${QA_EMAIL}' } });
      if (!user) return;
      const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await prisma.resume.deleteMany({ where: { candidateId: profile.id } });
        await prisma.candidateProfile.deleteMany({ where: { id: profile.id } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
    main().finally(() => prisma.$disconnect());
  `);
}

test.describe('QA candidate profile and CV flows', () => {
  test.beforeAll(() => {
    ensureQaCandidate();
  });

  test.afterAll(() => {
    cleanupQaCandidate();
  });

  test('profile blocks unauthenticated users and non-candidate accounts', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Please sign in to manage your profile and CV.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'sign in' })).toHaveAttribute(
      'href',
      '/login?next=/profile',
    );

    await signIn(page, 'recruiter@launchly.test');
    await page.goto('/profile');
    await expect(
      page.getByText('The profile and CV page is only available to candidate accounts.'),
    ).toBeVisible();
  });

  test('candidate can update profile fields and skills and persist across reload', async ({
    page,
  }) => {
    await signIn(page, QA_EMAIL);
    await page.goto('/profile');

    await page.locator('#fullName').fill('Tran Minh QA');
    await page.locator('#headline').fill('Junior Backend Engineer');
    await page.locator('#location').fill('Ho Chi Minh City');
    await page.locator('#schoolMajor').fill('HCMUT - Computer Science');
    await page.locator('#bio').fill('Focused on TypeScript, PostgreSQL, and clean REST APIs.');

    await page.locator('#skillInput').fill('TypeScript');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.locator('#skillInput').fill('PostgreSQL');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await page.locator('#projectsActivities').fill('Built Launchly QA automation scripts.');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved successfully.')).toBeVisible();

    await page.reload();
    await expect(page.locator('#fullName')).toHaveValue('Tran Minh QA');
    await expect(page.locator('#headline')).toHaveValue('Junior Backend Engineer');
    await expect(page.locator('#location')).toHaveValue('Ho Chi Minh City');
    await expect(page.locator('#schoolMajor')).toHaveValue('HCMUT - Computer Science');
    await expect(page.getByRole('button', { name: 'Remove skill TypeScript' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove skill PostgreSQL' })).toBeVisible();
  });

  test('candidate can reject non-PDF, upload, download, replace, and delete CV', async ({
    page,
  }) => {
    const pdfBuffer = fs.readFileSync(CV_FIXTURE);

    await signIn(page, QA_EMAIL);
    await page.goto('/profile');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a pdf document'),
    });
    await expect(
      page.getByText('Invalid file format. Only PDF documents are accepted.'),
    ).toBeVisible();

    await fileInput.setInputFiles(CV_FIXTURE);
    await page.getByRole('button', { name: 'Upload CV' }).click();
    await expect(page.getByText('cv-en.pdf')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download CV' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain('.pdf');

    await page.getByRole('button', { name: 'Replace' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'qa-cv-v2.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });
    await page.getByRole('button', { name: 'Replace current CV' }).click();
    await expect(page.getByText('qa-cv-v2.pdf')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Confirm CV deletion')).toBeVisible();
    await page.getByRole('button', { name: 'Delete CV' }).click();
    await expect(page.getByText('qa-cv-v2.pdf')).not.toBeVisible();
  });
});
