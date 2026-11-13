import { escapeHtml } from '@/providers/mail/html';

export type ModerationEmailInput =
  | { kind: 'company-approved'; companyName: string }
  | { kind: 'company-rejected'; companyName: string; reason: string }
  | { kind: 'job-published'; jobTitle: string; companyName: string }
  | { kind: 'job-rejected'; jobTitle: string; companyName: string; reason: string };

/** A mail header must stay on one line, so line breaks in a name become spaces. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

function content(input: ModerationEmailInput): { subject: string; lines: string[] } {
  switch (input.kind) {
    case 'company-approved':
      return {
        subject: `Công ty ${oneLine(input.companyName)} đã được duyệt trên Launchly`,
        lines: [`Công ty ${input.companyName} đã được duyệt. Bạn có thể đăng tin tuyển dụng ngay.`],
      };
    case 'company-rejected':
      return {
        subject: `Công ty ${oneLine(input.companyName)} chưa được duyệt trên Launchly`,
        lines: [
          `Công ty ${input.companyName} chưa được duyệt.`,
          `Lý do: ${input.reason}`,
          'Bạn có thể đăng ký một công ty khác trong khu vực nhà tuyển dụng.',
        ],
      };
    case 'job-published':
      return {
        subject: `Tin "${oneLine(input.jobTitle)}" đã được duyệt trên Launchly`,
        lines: [
          `Tin tuyển dụng "${input.jobTitle}" của ${input.companyName} đã được duyệt và hiển thị cho ứng viên.`,
        ],
      };
    case 'job-rejected':
      return {
        subject: `Tin "${oneLine(input.jobTitle)}" chưa được duyệt trên Launchly`,
        lines: [
          `Tin tuyển dụng "${input.jobTitle}" của ${input.companyName} chưa được duyệt.`,
          `Lý do: ${input.reason}`,
          'Bạn có thể chỉnh sửa tin và gửi duyệt lại trong khu vực nhà tuyển dụng.',
        ],
      };
  }
}

/** The outcome email sent to a recruiter; it carries only the names, the outcome and the reason. */
export function createModerationEmail(input: ModerationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const { subject, lines } = content(input);
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
