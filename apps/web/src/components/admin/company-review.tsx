'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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

  const load = useCallback(async () => {
    try {
      setCompany(await getAdminCompany(id));
    } catch (cause) {
      setError(authErrorMessage(cause));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(run: () => Promise<AdminCompany>) {
    setBusy(true);
    setError(null);
    try {
      setCompany(await run());
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') {
        // Another admin decided first (E1): show what they decided.
        setNotice('Mục này đã được xử lý');
        await load();
      } else {
        setError(authErrorMessage(cause));
      }
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
  const pending = company.moderationStatus === 'PENDING';

  return (
    <>
      {back}
      <div className="flex flex-wrap items-center gap-3">
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
      {pending && (
        <div className="flex justify-end gap-2">
          <RejectDialog
            heading="Từ chối công ty"
            disabled={busy}
            onSubmit={(reason) => decide(() => rejectCompany(company.id, reason))}
          />
          <Button disabled={busy} onClick={() => void decide(() => approveCompany(company.id))}>
            <CheckCircle2 className="size-4" aria-hidden />
            Duyệt
          </Button>
        </div>
      )}
    </>
  );
}
