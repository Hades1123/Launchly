'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { AdminCompany, CompanyModerationStatus } from '@launchly/shared';
import { MODERATION_DATE_FORMAT } from '@/components/admin/pending-company-list';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { approveCompany, getAdminCompany, rejectCompany } from '@/lib/api/admin-companies';
import { ApiError } from '@/lib/api/http';
import { authErrorMessage, type ErrorTranslator } from '@/lib/auth-helpers';

type AdminTranslator = ReturnType<typeof useTranslations<'admin'>>;

const statusTone: Record<CompanyModerationStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/** Readable text for a failed admin call; an invalid id only matters when loading. */
function moderationErrorText(
  error: unknown,
  t: AdminTranslator,
  tErrors: ErrorTranslator,
  loading = false,
): string {
  if (error instanceof ApiError) {
    if (error.code === 'NOT_FOUND' || (loading && error.code === 'VALIDATION_ERROR')) {
      return t('companyReview.notFound');
    }
    if (error.code === 'FORBIDDEN') return t('moderation.forbidden');
  }
  return authErrorMessage(error, tErrors);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line text-foreground">{children || '—'}</dd>
    </div>
  );
}

/** Everything a recruiter submitted for a company, with approve and reject while it is pending. */
export function CompanyReview({ id }: { id: string }) {
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The decision buttons are hidden once the company is known to be decided, even if a reload failed. */
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    let active = true;
    setCompany(null);
    setError(null);
    setNotice(null);
    setDecided(false);
    async function load() {
      try {
        const loaded = await getAdminCompany(id);
        if (active) setCompany(loaded);
      } catch (cause) {
        if (active) setError(moderationErrorText(cause, t, tErrors, true));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  /** Another admin decided first (E1): show what they decided. */
  async function showDecided() {
    setNotice(t('moderation.decided'));
    setDecided(true);
    try {
      setCompany(await getAdminCompany(id));
    } catch (cause) {
      setError(moderationErrorText(cause, t, tErrors));
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      setCompany(await approveCompany(id));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') await showDecided();
      else setError(moderationErrorText(cause, t, tErrors));
    } finally {
      setBusy(false);
    }
  }

  /** Throws a readable Error on failure so the dialog stays open with the reason. */
  async function reject(reason: string) {
    setBusy(true);
    setError(null);
    try {
      setCompany(await rejectCompany(id, reason));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') await showDecided();
      else throw new Error(moderationErrorText(cause, t, tErrors), { cause });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/admin/moderation" className={buttonClasses('ghost', 'w-fit')}>
      <ArrowLeft className="size-4" aria-hidden />
      {t('moderation.back')}
    </Link>
  );

  if (!company) {
    return (
      <>
        {back}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : (
          <div className="h-48 animate-pulse rounded-card bg-surface-muted" />
        )}
      </>
    );
  }

  return (
    <>
      {back}
      <div className="flex flex-wrap items-center gap-3">
        {company.logoUrl && (
          // A plain <img>: the logo is a recruiter-supplied URL or data URI, as on the register page.
          <img
            src={company.logoUrl}
            alt={t('companyReview.logoAlt', { name: company.name })}
            className="size-12 rounded-control object-cover shadow-card"
          />
        )}
        <h1 className="font-display text-2xl font-bold text-foreground">{company.name}</h1>
        <Badge tone={statusTone[company.moderationStatus]} shape="pill">
          {t(`moderation.status.${company.moderationStatus}`)}
        </Badge>
      </div>
      {notice && (
        <p role="status" className="rounded-control bg-warning-subtle p-3 text-sm text-warning">
          {notice}
        </p>
      )}
      {company.moderationStatus === 'REJECTED' && company.moderationReason && (
        <p className="rounded-control bg-danger-subtle p-3 text-sm text-danger">
          {t('moderation.reason', { reason: company.moderationReason })}
        </p>
      )}
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label={t('moderation.fields.address')}>{company.address}</Field>
          <Field label={t('moderation.fields.industry')}>{company.industry}</Field>
          <Field label={t('moderation.fields.companySize')}>{company.companySize}</Field>
          <Field label={t('moderation.fields.website')}>{company.website}</Field>
          <Field label={t('moderation.fields.recruiterEmail')}>{company.ownerEmail}</Field>
          <Field label={t('moderation.fields.submittedAt')}>
            {format.dateTime(new Date(company.createdAt), MODERATION_DATE_FORMAT)}
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('moderation.fields.description')}>{company.description}</Field>
          </div>
        </dl>
      </Card>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {company.moderationStatus === 'PENDING' && !decided && (
        <div className="flex justify-end gap-2">
          <RejectDialog
            heading={t('companyReview.rejectHeading')}
            disabled={busy}
            onSubmit={reject}
          />
          <Button disabled={busy} onClick={() => void approve()}>
            <CheckCircle2 className="size-4" aria-hidden />
            {t('moderation.approve')}
          </Button>
        </div>
      )}
    </>
  );
}
