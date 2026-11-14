import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { AssessmentDto } from '@launchly/shared';
import { useTranslations } from 'next-intl';
import { MatchGauge } from '@/components/cv-review/match-gauge';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Shown in the result column before the first analysis. */
export function ResultPlaceholder() {
  const t = useTranslations('candidate.cvReview.result');
  const steps = [t('placeholder.step1'), t('placeholder.step2'), t('placeholder.step3')];
  return (
    <Card className="flex flex-col items-center gap-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-foreground">
        <Sparkles className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t('placeholder.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('placeholder.body')}</p>
      </div>
      <ol className="grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="space-y-1 rounded-control bg-surface-muted p-4">
            <span className="font-mono text-xs font-semibold text-primary">0{index + 1}</span>
            <p className="text-sm text-foreground">{step}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Placeholder shapes while the AI works; the status text is announced to screen readers. */
export function ResultSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <span
          aria-hidden
          className="size-44 shrink-0 animate-pulse rounded-full bg-surface-muted"
        />
        <div className="w-full space-y-3">
          <span aria-hidden className="block h-6 w-1/2 animate-pulse rounded bg-surface-muted" />
          <p role="status" className="text-sm text-muted-foreground">
            {label}
          </p>
        </div>
      </Card>
      <div aria-hidden className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((card) => (
          <Card key={card} className="space-y-3">
            <span className="block h-5 w-1/3 animate-pulse rounded bg-surface-muted" />
            <span className="block h-4 w-full animate-pulse rounded bg-surface-muted" />
            <span className="block h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
          </Card>
        ))}
      </div>
    </div>
  );
}

/** The AI's verdict: score, what matches, what is missing, and how to improve. */
export function FitResult({ assessment }: { assessment: AssessmentDto }) {
  const t = useTranslations('candidate.cvReview.result');
  const { score, matched, missing, suggestions, evidence } = assessment.result;
  // Required gaps first: they decide the application.
  const sortedMissing = [...missing].sort(
    (a, b) => Number(b.importance === 'required') - Number(a.importance === 'required'),
  );

  return (
    <section aria-label={t('label')} className="space-y-6">
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <MatchGauge score={Math.round(score)} />
        <div className="space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold text-foreground">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('summary', { matched: matched.length, missing: missing.length })}
            </p>
          </div>
          {assessment.jobId && (
            <Link href={`/jobs/${assessment.jobId}`} className={buttonClasses('soft')}>
              {t('applyJob')}
            </Link>
          )}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-foreground">{t('matches')}</h3>
          {matched.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {matched.map((item, index) => (
                <li key={`${index}-${item.point}`} className="max-w-full">
                  {/* Long points wrap onto more lines; a tag shape suits multi-line text better than a pill. */}
                  <Badge tone="success" className="max-w-full">
                    <span className="min-w-0 wrap-break-word whitespace-normal">{item.point}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('matchesEmpty')}</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-foreground">{t('missing')}</h3>
          {sortedMissing.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {sortedMissing.map((item, index) => (
                <li key={`${index}-${item.skill}`} className="flex items-start gap-2">
                  <Badge tone={item.importance === 'required' ? 'danger' : 'warning'} shape="pill">
                    {item.importance === 'required' ? t('required') : t('niceToHave')}
                  </Badge>
                  <span className="text-foreground">{item.skill}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('missingEmpty')}</p>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{t('improve')}</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground marker:text-primary">
          {suggestions.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </Card>

      {evidence.length > 0 && (
        <div className="rounded-card bg-surface shadow-card">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {t('evidence')}
              </h3>
              <ChevronDown
                className="size-5 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ul className="space-y-1.5 px-6 pb-6 text-sm text-muted-foreground">
              {evidence.map((item, index) => (
                <li key={`${index}-${item}`}>“{item}”</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}
