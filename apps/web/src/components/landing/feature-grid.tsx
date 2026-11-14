import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  CircleDashed,
  FileSearch,
  ListChecks,
  MessagesSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

type FeatureKey = 'cvReview' | 'interview' | 'process';
type Translate = ReturnType<typeof useTranslations<'landing.features'>>;

const features: { key: FeatureKey; href: string; icon: LucideIcon }[] = [
  { key: 'cvReview', href: '/cv-review', icon: FileSearch },
  { key: 'interview', href: '/interview-practice', icon: MessagesSquare },
  { key: 'process', href: '/applications', icon: ListChecks },
];

const processSteps = ['cv', 'test', 'interview', 'offer'] as const;

/** A still of each tool's own UI. */
function preview(key: FeatureKey, t: Translate): ReactNode {
  if (key === 'cvReview') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {['SQL', 'Python', 'Excel'].map((skill) => (
          <Badge key={skill} tone="success">
            <Check className="size-3" strokeWidth={2.5} />
            {skill}
          </Badge>
        ))}
        <Badge tone="warning">
          <CircleDashed className="size-3" strokeWidth={2} />
          Power BI
        </Badge>
      </div>
    );
  }
  if (key === 'interview') {
    return (
      <div className="space-y-2 text-xs">
        <p className="w-fit max-w-full rounded-card rounded-tl-none bg-surface-strong px-3 py-2 text-foreground">
          {t('interview.question')}
        </p>
        <p className="ml-auto w-fit max-w-full rounded-card rounded-tr-none bg-primary px-3 py-2 text-primary-foreground">
          {t('interview.answer')}
        </p>
      </div>
    );
  }
  return (
    <ol className="flex items-center gap-1.5 text-xs font-medium">
      {processSteps.map((step, index) => (
        <li key={step} className="flex flex-1 items-center gap-1.5">
          <span
            className={
              index < 2
                ? 'flex-1 rounded-full bg-success-subtle px-2 py-1 text-center text-success'
                : index === 2
                  ? 'flex-1 rounded-full bg-primary px-2 py-1 text-center text-primary-foreground'
                  : 'flex-1 rounded-full bg-surface-strong px-2 py-1 text-center text-subtle-foreground'
            }
          >
            {t(`process.steps.${step}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Three tools candidates use around an application, each with a still of its own UI. */
export function FeatureGrid() {
  const t = useTranslations('landing.features');
  return (
    <section aria-labelledby="features-title" className="bg-surface">
      <div className="mx-auto w-full max-w-page space-y-10 px-4 py-16 md:px-8 lg:py-20">
        <div className="max-w-2xl space-y-2">
          <h2
            id="features-title"
            className="font-display text-3xl font-bold tracking-tight text-foreground"
          >
            {t('title')}
          </h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <ul className="grid gap-6 md:grid-cols-3">
          {features.map(({ key, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-5 rounded-card bg-surface-muted p-6 transition-all hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex size-11 items-center justify-center rounded-control bg-primary-subtle text-primary-subtle-foreground">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`${key}.body`)}
                  </p>
                </div>
                <div aria-hidden className="mt-auto rounded-card bg-surface p-4 shadow-card">
                  {preview(key, t)}
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {t(`${key}.action`)}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
