import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="font-display text-3xl leading-tight font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AuthField({
  label,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const inputId = id ?? props.name;
  const errorId = `${inputId}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'min-h-12 w-full rounded-control border bg-surface px-3.5 text-sm text-foreground transition outline-none',
          'placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-ring/20',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle-foreground',
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-input',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs leading-5 text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField({
  label,
  trailingLabel,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailingLabel?: ReactNode;
  error?: string;
}) {
  const t = useTranslations('auth.ui');
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  const errorId = `${inputId}-error`;
  const VisibilityIcon = visible ? EyeOff : Eye;
  const visibilityLabel = visible ? t('hidePassword') : t('showPassword');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
          {label}
        </label>
        {trailingLabel}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={cn(
            'min-h-12 w-full rounded-control border bg-surface px-3.5 pr-12 text-sm text-foreground transition outline-none',
            'placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-ring/20',
            'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle-foreground',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-input',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visibilityLabel}
          aria-pressed={visible}
          title={visibilityLabel}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-control text-muted-foreground transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <VisibilityIcon className="size-4" aria-hidden />
        </button>
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs leading-5 text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthFeedback({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles = {
    error: 'bg-danger-subtle text-danger',
    success: 'bg-success-subtle text-success',
    info: 'bg-primary-subtle text-primary-subtle-foreground',
  } as const;
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-control p-3 text-sm leading-5', styles[tone])}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  disabled,
}: {
  children: ReactNode;
  pending: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card-hover transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function AuthDivider() {
  const t = useTranslations('auth.ui');
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-subtle-foreground">{t('or')}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
