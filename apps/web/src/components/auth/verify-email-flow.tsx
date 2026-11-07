'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { messageResponseSchema, resendVerificationSchema } from '@launchly/shared';
import { AuthFeedback, AuthField, AuthHeading, SubmitButton } from '@/components/auth/auth-ui';
import { authErrorMessage, authRequest, AuthRequestError } from '@/lib/auth-api';

type VerificationState = 'verifying' | 'success' | 'expired' | 'missing' | 'error';

export function VerifyEmailFlow({ token }: { token?: string }) {
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>(token ? 'verifying' : 'missing');
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void (async () => {
      try {
        await authRequest('/verify-email', messageResponseSchema, {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        window.history.replaceState(null, '', '/verify-email');
        setState('success');
      } catch (cause) {
        if (cause instanceof AuthRequestError && cause.status === 400) {
          window.history.replaceState(null, '', '/verify-email');
          setState('expired');
        } else {
          setState('error');
        }
        setError(authErrorMessage(cause));
      }
    })();
  }, [attempt, token]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const parsed = resendVerificationSchema.safeParse({ email });
    if (!parsed.success) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      setPending(false);
      return;
    }
    try {
      const result = await authRequest('/resend-verification', messageResponseSchema, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      setNotice(result.message);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (state === 'verifying') {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow="Xác minh email"
          title="Đang xác minh"
          description="Đang kiểm tra liên kết xác minh của bạn."
        />
        <p role="status" className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát…</p>
      </section>
    );
  }

  if (state === 'success') {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow="Xác minh email"
          title="Email đã được xác minh"
          description="Bạn có thể đăng nhập để tiếp tục."
        />
        <AuthFeedback tone="success">Tài khoản Launchly của bạn đã sẵn sàng.</AuthFeedback>
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Đến trang đăng nhập
        </Link>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow="Xác minh email"
          title="Chưa thể xác minh"
          description="Có sự cố khi kiểm tra liên kết. Bạn có thể thử lại."
        />
        {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
        <button
          type="button"
          onClick={() => {
            started.current = false;
            setAttempt((value) => value + 1);
            setState('verifying');
            setError(null);
          }}
          className="mt-5 min-h-12 w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Thử xác minh lại
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow="Xác minh email"
        title={state === 'expired' ? 'Liên kết không còn hiệu lực' : 'Chưa có liên kết xác minh'}
        description="Nhập email đăng ký để yêu cầu gửi lại liên kết xác minh."
      />
      {error && <div className="mb-4"><AuthFeedback tone="error">{error}</AuthFeedback></div>}
      {notice && <div className="mb-4"><AuthFeedback tone="success">{notice}</AuthFeedback></div>}
      <form className="space-y-4" onSubmit={resend} noValidate>
        <AuthField
          label="Email đăng ký"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ban@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <SubmitButton pending={pending}>Gửi lại email xác minh</SubmitButton>
      </form>
      <Link
        href="/login"
        className="mt-5 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        Quay lại đăng nhập
      </Link>
    </section>
  );
}
