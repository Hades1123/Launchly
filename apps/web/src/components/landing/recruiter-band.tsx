import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Entry point for employers; the recruiter area asks signed-out visitors to sign in first. */
export function RecruiterBand() {
  const t = useTranslations('landing.recruiter');
  return (
    <section aria-labelledby="recruiter-title" className="bg-background">
      <div className="mx-auto w-full max-w-page px-4 pb-16 md:px-8 lg:pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-card bg-primary px-6 py-10 text-primary-foreground md:flex-row md:items-center md:px-12">
          <div className="max-w-2xl space-y-2">
            <h2 id="recruiter-title" className="font-display text-2xl font-bold tracking-tight">
              {t('title')}
            </h2>
            <p className="text-primary-foreground/85">{t('body')}</p>
          </div>
          <Link
            href="/recruiter/jobs/new"
            className="group inline-flex shrink-0 items-center gap-2 rounded-control bg-surface px-5 py-3 text-sm font-semibold text-primary shadow-card transition-colors hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none"
          >
            {t('action')}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
