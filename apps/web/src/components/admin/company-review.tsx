'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { AdminCompany, CompanyModerationStatus } from '@launchly/shared';
import { moderationDate } from '@/components/admin/pending-company-list';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { approveCompany, getAdminCompany, rejectCompany } from '@/lib/api/admin-companies';
import { ApiError } from '@/lib/api/http';
import { authErrorMessage } from '@/lib/auth-helpers';

const statusView: Record<CompanyModerationStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
};

const DECIDED = 'Mục này đã được xử lý';

/** Readable Vietnamese text for a failed admin call. */
function moderationErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NOT_FOUND' || error.code === 'VALIDATION_ERROR') {
      return 'Không tìm thấy công ty.';
    }
    if (error.code === 'FORBIDDEN') return 'Bạn không có quyền duyệt nội dung.';
  }
  return authErrorMessage(error);
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
  const [company, setCompany] = useState<AdminCompany | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setCompany(null);
    setError(null);
    setNotice(null);
    async function load() {
      try {
        const loaded = await getAdminCompany(id);
        if (active) setCompany(loaded);
      } catch (cause) {
        if (active) setError(moderationErrorText(cause));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  /** Another admin decided first (E1): show what they decided. */
  async function showDecided() {
    setNotice(DECIDED);
    setCompany(await getAdminCompany(id));
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      setCompany(await approveCompany(id));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') await showDecided();
      else setError(moderationErrorText(cause));
    } finally {
      setBusy(false);
    }
  }

  /** Throws a readable Error on failure so the dialog stays open with the reason. */
  async function reject(reason: string) {
    setBusy(true);
    try {
      setCompany(await rejectCompany(id, reason));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') await showDecided();
      else throw new Error(moderationErrorText(cause), { cause });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/admin/moderation" className={buttonClasses('ghost', 'w-fit')}>
      <ArrowLeft className="size-4" aria-hidden />
      Hàng chờ duyệt
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

  const view = statusView[company.moderationStatus];

  return (
    <>
      {back}
      <div className="flex flex-wrap items-center gap-3">
        {company.logoUrl && (
          // A plain <img>: the logo is a recruiter-supplied URL or data URI, as on the register page.
          <img
            src={company.logoUrl}
            alt={`Logo ${company.name}`}
            className="size-12 rounded-control object-cover shadow-card"
          />
        )}
        <h1 className="font-display text-2xl font-bold text-foreground">{company.name}</h1>
        <Badge tone={view.tone} shape="pill">
          {view.label}
        </Badge>
      </div>
      {notice && (
        <p role="status" className="rounded-control bg-warning-subtle p-3 text-sm text-warning">
          {notice}
        </p>
      )}
      {company.moderationStatus === 'REJECTED' && company.moderationReason && (
        <p className="rounded-control bg-danger-subtle p-3 text-sm text-danger">
          Lý do: {company.moderationReason}
        </p>
      )}
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Địa chỉ">{company.address}</Field>
          <Field label="Lĩnh vực">{company.industry}</Field>
          <Field label="Quy mô">{company.companySize}</Field>
          <Field label="Website">{company.website}</Field>
          <Field label="Email nhà tuyển dụng">{company.ownerEmail}</Field>
          <Field label="Gửi lúc">{moderationDate.format(new Date(company.createdAt))}</Field>
          <div className="sm:col-span-2">
            <Field label="Mô tả">{company.description}</Field>
          </div>
        </dl>
      </Card>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {company.moderationStatus === 'PENDING' && (
        <div className="flex justify-end gap-2">
          <RejectDialog heading="Từ chối công ty" disabled={busy} onSubmit={reject} />
          <Button disabled={busy} onClick={() => void approve()}>
            <CheckCircle2 className="size-4" aria-hidden />
            Duyệt
          </Button>
        </div>
      )}
    </>
  );
}
