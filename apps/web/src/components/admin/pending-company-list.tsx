'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { AdminCompany } from '@launchly/shared';
import { Card } from '@/components/ui/card';
import { listAdminCompanies } from '@/lib/api/admin-companies';
import { authErrorMessage } from '@/lib/auth-helpers';

/** How the moderation screens show when an item was submitted or reviewed. */
export const MODERATION_DATE_FORMAT = { dateStyle: 'medium', timeStyle: 'short' } as const;

type State =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; companies: AdminCompany[] };

/** Pending companies, oldest first, each linking to its review page. */
export function PendingCompanyList() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const format = useFormatter();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const companies = await listAdminCompanies('PENDING');
        if (active) setState({ kind: 'ready', companies });
      } catch (error) {
        if (active) setState({ kind: 'error', error });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === 'loading') {
    return <div className="h-24 animate-pulse rounded-card bg-surface-muted" />;
  }
  if (state.kind === 'error') {
    return (
      <p role="alert" className="text-sm text-danger">
        {authErrorMessage(state.error, tErrors)}
      </p>
    );
  }
  if (state.companies.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{t('moderation.empty')}</p>
      </Card>
    );
  }

  return (
    <section aria-labelledby="pending-companies" className="space-y-3">
      <h2 id="pending-companies" className="font-display text-lg font-semibold text-foreground">
        {t('pendingCompanies.heading')}
      </h2>
      <ul className="space-y-3">
        {state.companies.map((company) => (
          <li key={company.id}>
            <Card className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-primary">
                <Building2 className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/moderation/companies/${company.id}`}
                  className="rounded-control font-semibold text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {company.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {[company.industry, company.companySize].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <p className="shrink-0 text-xs text-subtle-foreground">
                {t('moderation.submittedAt', {
                  date: format.dateTime(new Date(company.createdAt), MODERATION_DATE_FORMAT),
                })}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
