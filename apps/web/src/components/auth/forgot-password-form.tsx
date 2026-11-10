'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { forgotPasswordSchema } from '@launchly/shared';
import { AuthFeedback, AuthField, AuthHeading, SubmitButton } from '@/components/auth/auth-ui';
import { authErrorMessage } from '@/lib/auth-helpers';
import { forgotPassword } from '@/lib/api/auth';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      await forgotPassword(parsed.data);
      setSubmitted(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      {submitted ? (
        <>
          <AuthHeading
            eyebrow="Khôi phục tài khoản"
            title="Kiểm tra email"
            description="Nếu email đủ điều kiện, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư."
          />
          <div className="space-y-4">
            <AuthFeedback tone="success">
              Yêu cầu đã được tiếp nhận. Nếu tài khoản tồn tại, email sẽ sớm được gửi.
            </AuthFeedback>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </>
      ) : (
        <>
          <AuthHeading
            eyebrow="Khôi phục tài khoản"
            title="Đặt lại mật khẩu"
            description="Nhập email đã đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi liên kết đặt lại."
          />
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <AuthField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldError}
              required
            />
            {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
            <SubmitButton pending={pending}>Gửi liên kết đặt lại</SubmitButton>
          </form>
          <Link
            href="/login"
            className="mt-6 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            Quay lại đăng nhập
          </Link>
        </>
      )}
    </section>
  );
}
