import { describe, expect, it } from 'vitest';
import { createAuthEmail } from '@/providers/mail/auth-email-templates';

describe('auth email templates', () => {
  it('creates a branded verification email with an accessible text fallback', () => {
    const url = 'https://launchly.example/verify-email?token=abc123&source=email';
    const message = createAuthEmail('verification', url);

    expect(message.subject).toContain('Launchly');
    expect(message.text).toContain(url);
    expect(message.text).toContain('24 giờ');
    expect(message.html).toContain('lang="vi"');
    expect(message.html).toContain('Xác nhận email');
    expect(message.html).toContain('token=abc123&amp;source=email');
    expect(message.html).toContain('Nếu bạn không tạo tài khoản');
  });

  it('uses the reset-password expiry and security copy', () => {
    const message = createAuthEmail(
      'password-reset',
      'https://launchly.example/reset-password?token=abc123',
    );

    expect(message.subject).toContain('mật khẩu');
    expect(message.text).toContain('30 phút');
    expect(message.html).toContain('chỉ dùng một lần');
    expect(message.html).toContain('Mật khẩu hiện tại của bạn sẽ không thay đổi');
  });
});
