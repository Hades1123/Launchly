import { escapeHtml } from '@/providers/mail/auth-email-templates';

export type ModerationEmailInput =
  | { kind: 'company-approved'; companyName: string }
  | { kind: 'company-rejected'; companyName: string; reason: string };

/** The outcome email sent to a recruiter; it carries only the company name, outcome and reason. */
export function createModerationEmail(input: ModerationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const approved = input.kind === 'company-approved';
  // A mail header must stay on one line, so line breaks in the name become spaces.
  const name = input.companyName.replace(/[\r\n]+/g, ' ');
  const subject = approved
    ? `Công ty ${name} đã được duyệt trên Launchly`
    : `Công ty ${name} chưa được duyệt trên Launchly`;
  const lines = approved
    ? [`Công ty ${input.companyName} đã được duyệt. Bạn có thể đăng tin tuyển dụng ngay.`]
    : [
        `Công ty ${input.companyName} chưa được duyệt.`,
        `Lý do: ${input.reason}`,
        'Bạn có thể đăng ký một công ty khác trong khu vực nhà tuyển dụng.',
      ];
  const footer = 'Launchly | Nền tảng kết nối nhân tài và cơ hội nghề nghiệp';
  const text = [...lines, '', footer].join('\n');
  const html = `<!doctype html>
<html lang="vi">
  <body style="font-family:Arial,Helvetica,sans-serif;color:#172d2a;">
    ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n    ')}
    <p style="color:#5b6f6b;font-size:12px;">${footer}</p>
  </body>
</html>`;
  return { subject, text, html };
}
