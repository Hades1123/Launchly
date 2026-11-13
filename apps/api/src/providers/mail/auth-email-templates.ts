import { escapeHtml } from '@/providers/mail/html';

type AuthEmailKind = 'verification' | 'google-link' | 'password-reset';

const copy: Record<
  AuthEmailKind,
  {
    subject: string;
    preheader: string;
    heading: string;
    message: string;
    action: string;
    expires: string;
    security: string;
  }
> = {
  verification: {
    subject: 'Xác nhận email của bạn | Launchly',
    preheader: 'Chỉ còn một bước để hoàn tất tài khoản Launchly.',
    heading: 'Xác nhận địa chỉ email',
    message: 'Chào mừng bạn đến với Launchly. Xác nhận email để kích hoạt tài khoản và bắt đầu sử dụng nền tảng.',
    action: 'Xác nhận email',
    expires: 'Liên kết có hiệu lực trong 24 giờ.',
    security: 'Nếu bạn không tạo tài khoản Launchly, hãy bỏ qua email này.',
  },
  'google-link': {
    subject: 'Xác nhận liên kết Google | Launchly',
    preheader: 'Có yêu cầu liên kết tài khoản Google với Launchly.',
    heading: 'Xác nhận liên kết tài khoản',
    message: 'Chúng tôi nhận được yêu cầu đăng nhập bằng Google cho tài khoản Launchly này. Xác nhận để hoàn tất liên kết.',
    action: 'Xác nhận liên kết',
    expires: 'Liên kết có hiệu lực trong 30 phút.',
    security: 'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Tài khoản sẽ không được liên kết.',
  },
  'password-reset': {
    subject: 'Đặt lại mật khẩu Launchly',
    preheader: 'Làm theo hướng dẫn bảo mật để đặt mật khẩu mới.',
    heading: 'Đặt lại mật khẩu',
    message: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Launchly của bạn.',
    action: 'Tạo mật khẩu mới',
    expires: 'Liên kết chỉ dùng một lần và có hiệu lực trong 30 phút.',
    security: 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn sẽ không thay đổi.',
  },
};

export function createAuthEmail(
  kind: AuthEmailKind,
  actionUrl: string,
): { subject: string; text: string; html: string } {
  const content = copy[kind];
  const safeUrl = escapeHtml(actionUrl);
  const text = [
    content.heading,
    '',
    content.message,
    '',
    `${content.action}: ${actionUrl}`,
    content.expires,
    '',
    content.security,
    '',
    'Launchly | Nền tảng kết nối nhân tài và cơ hội nghề nghiệp',
  ].join('\n');

  const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f6f5;font-family:Arial,Helvetica,sans-serif;color:#172d2a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f6f5;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e1e9e6;border-radius:16px;">
            <tr>
              <td style="padding:28px 36px;border-bottom:1px solid #edf1ef;">
                <span style="font-size:20px;line-height:28px;font-weight:700;letter-spacing:-0.5px;color:#123b35;">Launchly</span>
                <span style="display:inline-block;margin-left:10px;padding-left:12px;border-left:1px solid #dce5e1;font-size:12px;line-height:18px;color:#64736f;">Tài khoản của bạn</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 36px 12px;">
                <div style="width:40px;height:4px;background-color:#167d68;border-radius:4px;margin-bottom:24px;"></div>
                <h1 style="margin:0 0 14px;font-size:26px;line-height:34px;letter-spacing:-0.6px;color:#172d2a;">${escapeHtml(content.heading)}</h1>
                <p style="margin:0;font-size:15px;line-height:25px;color:#50615c;">${escapeHtml(content.message)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 12px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td bgcolor="#167d68" style="border-radius:8px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border:1px solid #167d68;border-radius:8px;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;">${escapeHtml(content.action)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-size:13px;line-height:21px;color:#64736f;">${escapeHtml(content.expires)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 32px;">
                <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64736f;">Nếu nút không hoạt động, sao chép và mở liên kết này:</p>
                <a href="${safeUrl}" style="font-size:12px;line-height:20px;color:#167d68;word-break:break-all;">${safeUrl}</a>
                <div style="height:1px;margin:24px 0;background-color:#edf1ef;"></div>
                <p style="margin:0;font-size:13px;line-height:21px;color:#64736f;">${escapeHtml(content.security)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;line-height:20px;color:#788681;">Launchly · Kết nối nhân tài và cơ hội nghề nghiệp</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: content.subject, text, html };
}
