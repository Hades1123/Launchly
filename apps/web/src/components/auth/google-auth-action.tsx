'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registrationRoleSchema } from '@launchly/shared';
import { useLocale, useTranslations } from 'next-intl';
import { AuthFeedback } from '@/components/auth/auth-ui';
import type { Locale } from '@/i18n/locale';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage, postLoginPath } from '@/lib/auth-helpers';
import { signInWithGoogle } from '@/lib/api/auth';

type GoogleCredentialResponse = { credential: string };
type GoogleButtonOptions = {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  width: number;
  locale: Locale;
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
  const t = useTranslations('auth.google');
  const locale = useLocale();
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
      locale,
    });
  }, [clientId, handleCredential, locale, scriptReady]);

  if (!clientId) {
    return <AuthFeedback tone="info">{t('notConfigured')}</AuthFeedback>;
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
        <AuthFeedback tone="error">{t('scriptError')}</AuthFeedback>
      ) : (
        <div
          ref={containerRef}
          aria-label={t('buttonLabel')}
          aria-busy={!scriptReady || disabled}
          className={`flex min-h-11 w-full justify-center overflow-hidden ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        />
      )}
    </>
  );
}

export function GoogleAuthAction({ returnTo }: { returnTo?: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
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
        const result = await signInWithGoogle({ idToken, ...(role ? { role } : {}) });
        if ('accessToken' in result) {
          acceptSession(result.accessToken, result.user);
          router.replace(postLoginPath(result.user.role, returnTo));
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
        setError(authErrorMessage(cause, tErrors));
      } finally {
        setPending(false);
      }
    },
    [acceptSession, returnTo, router, tErrors],
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
        <AuthFeedback tone="info">{t('google.linkPending')}</AuthFeedback>
        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {t('common.backToLogin')}
        </Link>
      </div>
    );
  }

  if (phase === 'role') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-foreground">{t('google.chooseRole')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => {
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
                  {t(`google.roles.${role}.title`)}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {t(`google.roles.${role}.description`)}
                </span>
              </button>
            );
          })}
        </div>
        {pending && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {t('google.creatingAccount')}
          </p>
        )}
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
          {t('google.otherAccount')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GoogleIdentityButton onCredential={handleCredential} disabled={pending} />
      {pending && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {t('google.verifying')}
        </p>
      )}
      {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
    </div>
  );
}
