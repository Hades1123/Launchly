import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RegisterAction } from '@/components/landing/register-action';
import { ProductPreview } from '@/components/landing/product-preview';
import { buttonClasses } from '@/components/ui/button';

const quickLevels = [
  { key: 'intern', href: '/jobs?level=INTERN' },
  { key: 'fresher', href: '/jobs?level=FRESHER' },
  { key: 'junior', href: '/jobs?level=JUNIOR' },
] as const;

/** First screen: what Launchly is, a job search that opens /jobs, and the product itself. */
export function LandingHero({ openPositions }: { openPositions: number }) {
  const t = useTranslations('landing.hero');
  return (
    <section aria-labelledby="hero-title" className="bg-surface">
      <div className="mx-auto grid w-full max-w-page items-center gap-12 px-4 py-16 md:px-8 lg:grid-cols-12 lg:py-24">
        <div className="space-y-8 motion-safe:animate-enter lg:col-span-7">
          {openPositions > 0 && (
            <p className="inline-flex items-center gap-2 rounded-full bg-success-subtle px-3 py-1 text-sm font-semibold text-success">
              <span aria-hidden className="size-2 rounded-full bg-success" />
              {t('openPositions', { count: openPositions })}
            </p>
          )}

          <div className="space-y-5">
            <h1
              id="hero-title"
              className="max-w-3xl font-display text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl"
            >
              {t('title')}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>

          <form
            action="/jobs"
            role="search"
            className="flex max-w-2xl flex-col gap-3 rounded-card bg-surface p-2 shadow-card-hover sm:flex-row"
          >
            <label htmlFor="hero-keyword" className="sr-only">
              {t('searchLabel')}
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-subtle-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                id="hero-keyword"
                type="search"
                name="keyword"
                placeholder={t('searchPlaceholder')}
                className="h-12 w-full rounded-control bg-surface-muted pr-4 pl-11 text-base text-foreground placeholder:text-subtle-foreground focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
            <button type="submit" className={buttonClasses('primary', 'h-12 px-6')}>
              {t('searchButton')}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{t('byLevel')}</span>
              {quickLevels.map((level) => (
                <Link
                  key={level.href}
                  href={level.href}
                  className="rounded-full bg-surface-strong px-3 py-1 font-medium text-foreground transition-colors hover:bg-primary-subtle hover:text-primary-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {t(`levels.${level.key}`)}
                </Link>
              ))}
            </div>
            <RegisterAction />
          </div>
        </div>

        <div className="motion-safe:animate-enter-late lg:col-span-5">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
