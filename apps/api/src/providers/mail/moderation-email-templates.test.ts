import { describe, expect, it } from 'vitest';
import { createModerationEmail } from '@/providers/mail/moderation-email-templates';

describe('createModerationEmail', () => {
  it('names the company in an approval email', () => {
    const email = createModerationEmail({ kind: 'company-approved', companyName: 'Acme' });
    expect(email.subject).toContain('Acme');
    expect(email.text).toContain('Acme');
    expect(email.html).toContain('Acme');
  });

  it('includes the reason in a rejection email', () => {
    const email = createModerationEmail({
      kind: 'company-rejected',
      companyName: 'Acme',
      reason: 'Missing business licence',
    });
    expect(email.subject).toContain('Acme');
    expect(email.text).toContain('Missing business licence');
    expect(email.html).toContain('Missing business licence');
  });

  it('escapes HTML in the company name and the reason', () => {
    const email = createModerationEmail({
      kind: 'company-rejected',
      companyName: '<b>Acme</b>',
      reason: '<script>alert(1)</script>',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<b>Acme');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('createModerationEmail subject', () => {
  it('keeps line breaks in the company name out of the subject', () => {
    const email = createModerationEmail({
      kind: 'company-approved',
      companyName: 'Acme\r\nBcc: x',
    });
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject).toContain('Acme Bcc: x');
  });
});

describe('createModerationEmail for jobs', () => {
  it('names the job and the company in a published email', () => {
    const email = createModerationEmail({
      kind: 'job-published',
      jobTitle: 'Backend intern',
      companyName: 'Acme',
    });
    expect(email.subject).toContain('Backend intern');
    expect(email.text).toContain('Backend intern');
    expect(email.text).toContain('Acme');
    expect(email.text).toContain('đã được duyệt');
  });

  it('includes the reason in a rejected email', () => {
    const email = createModerationEmail({
      kind: 'job-rejected',
      jobTitle: 'Backend intern',
      companyName: 'Acme',
      reason: 'Not entry level',
    });
    expect(email.subject).toContain('Backend intern');
    expect(email.text).toContain('Lý do: Not entry level');
  });

  it('escapes HTML and keeps line breaks out of the subject', () => {
    const email = createModerationEmail({
      kind: 'job-rejected',
      jobTitle: 'Intern\r\n<script>',
      companyName: 'Acme',
      reason: '<b>x</b>',
    });
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<b>x');
  });
});
