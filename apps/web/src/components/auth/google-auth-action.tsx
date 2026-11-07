'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  googleSignInResponseSchema,
  registrationRoleSchema,
} from '@launchly/shared';
import { AuthFeedback } from '@/components/auth/auth-ui';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage, authRequest } from '@/lib/auth-api';

type GoogleCredentialResponse = { credential: string };
type GoogleButtonOptions = {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  width: number;
  locale: 'vi';
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (container: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

function GoogleIdentityButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(
    (response: GoogleCredentialResponse) => {
      if (response.credential) onCredential(response.credential);
    },
    [onCredential],
  );

  useEffect(() => {
    const container = containerRef.current;
    const googleIdentity = window.google?.accounts.id;
    if (!clientId || !scriptReady || !container || !googleIdentity) return;

    container.replaceChildren();
    googleIdentity.initialize({ client_id: clientId, callback: handleCredential });
    googleIdentity.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: Math.max(220, Math.min(container.clientWidth, 400)),
      locale: 'vi',
    });
  }, [clientId, handleCredential, scriptReady]);

  if (!clientId) {
    return (
      <AuthFeedback tone="info">
        Đăng nhập Google chưa được cấu hình cho môi trường này.
      </AuthFeedback>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setScriptError(true)}
      />
      {scriptError ? (
        <AuthFeedback tone="error">
          Không tải được dịch vụ Google. Vui lòng thử lại sau.
        </AuthFeedback>
      ) : (
        <div
          ref={containerRef}
          aria-label="Đăng nhập với Google"
          aria-busy={!scriptReady || disabled}
          className={`flex min-h-11 w-full justify-center overflow-hidden ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        />
      )}
    </>
  );
}

export function GoogleAuthAction({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [phase, setPhase] = useState<'button' | 'role' | 'pending'>('button');
  const [identityToken, setIdentityToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<Array<'CANDIDATE' | 'RECRUITER'>>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitIdentity = useCallback(
    async (idToken: string, role?: 'CANDIDATE' | 'RECRUITER') => {
      setPending(true);
      setError(null);
      try {
        const result = await authRequest('/google', googleSignInResponseSchema, {
          method: 'POST',
          body: JSON.stringify({ idToken, ...(role ? { role } : {}) }),
        });
        if ('accessToken' in result) {
          acceptSession(result.accessToken, result.user, result.expiresIn);
          router.replace(returnTo || '/jobs');
          return;
        }
        if ('requiresRoleSelection' in result) {
          setIdentityToken(idToken);
          setRoles(result.roles.filter((item) => registrationRoleSchema.safeParse(item).success));
          setPhase('role');
        } else {
          setPhase('pending');
        }
      } catch (cause) {
        setError(authErrorMessage(cause));
      } finally {
        setPending(false);
      }
    },
    [acceptSession, returnTo, router],
  );

  const handleCredential = useCallback(
    (credential: string) => {
      void submitIdentity(credential);
    },
    [submitIdentity],
  );

  if (phase === 'pending') {
    return (
      <div className="space-y-4">
        <AuthFeedback tone="info">
          Cần xác nhận liên kết tài khoản. Hãy kiểm tra hộp thư của email Google rồi mở liên kết
          Launchly để tiếp tục.
        </AuthFeedback>
        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  if (phase === 'role') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-foreground">Chọn loại tài khoản để tiếp tục</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => {
            const candidate = role === 'CANDIDATE';
            return (
              <button
                key={role}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (identityToken) void submitIdentity(identityToken, role);
                }}
                className="rounded-card bg-surface-muted p-4 text-left transition hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
              >
                <span className="block text-sm font-semibold text-foreground">
                  {candidate ? 'Ứng viên' : 'Nhà tuyển dụng'}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {candidate ? 'Tìm kiếm và theo dõi cơ hội việc làm.' : 'Khám phá ứng viên phù hợp.'}
                </span>
              </button>
            );
          })}
        </div>
        {pending && <p role="status" className="text-center text-sm text-muted-foreground">Đang tạo tài khoản…</p>}
        {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
        <button
          type="button"
          onClick={() => {
            setPhase('button');
            setIdentityToken(null);
            setError(null);
          }}
          className="w-full rounded-control py-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Chọn tài khoản Google khác
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GoogleIdentityButton onCredential={handleCredential} disabled={pending} />
      {pending && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Đang xác minh tài khoản Google…
        </p>
      )}
      {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
    </div>
  );
}
