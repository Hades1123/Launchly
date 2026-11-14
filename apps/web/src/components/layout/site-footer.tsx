import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BrandLogo } from '@/components/layout/brand-logo';

// Message keys under `layout.footer`.
const columns = [
  {
    title: 'features.title',
    links: [
      { label: 'features.jobs', href: '/jobs' },
      { label: 'features.cvReview', href: '/cv-review' },
      { label: 'features.interviewPractice', href: '/interview-practice' },
      { label: 'features.applications', href: '/applications' },
    ],
  },
  {
    title: 'candidates.title',
    links: [
      { label: 'candidates.screeningGuide' },
      { label: 'candidates.skillStandards' },
      { label: 'candidates.salaryReport' },
      { label: 'candidates.graduateSupport' },
    ],
  },
] as const;

const legalLinks = ['legal.privacy', 'legal.terms', 'legal.dataProtection'] as const;

export function SiteFooter() {
  const t = useTranslations('layout.footer');

  return (
    <footer className="w-full bg-surface">
      <div className="mx-auto max-w-page px-4 py-12 md:px-8">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo />
            <p className="text-xs leading-relaxed text-muted-foreground">{t('tagline')}</p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-4 font-display text-sm font-semibold">{t(column.title)}</h2>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {'href' in link ? (
                      <Link href={link.href} className="transition-colors hover:text-primary">
                        {t(link.label)}
                      </Link>
                    ) : (
                      <span>{t(link.label)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="mb-4 font-display text-sm font-semibold">{t('compliance.title')}</h2>
            <div className="space-y-1 rounded-card bg-surface-muted p-4">
              <div className="flex items-center gap-1 font-display text-sm font-semibold text-success">
                <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden />
                {t('compliance.badge')}
              </div>
              <p className="text-xs text-muted-foreground">{t('compliance.description')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-xs text-subtle-foreground md:flex-row">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-6">
            {legalLinks.map((label) => (
              <span key={label}>{t(label)}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
