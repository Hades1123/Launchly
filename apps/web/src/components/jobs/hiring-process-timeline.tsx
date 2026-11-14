import { Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProcessView } from '@launchly/shared';
import { Card } from '@/components/ui/card';

/**
 * The hiring rounds of a public job, in the recruiter's order. Pass the view from
 * `buildProcessView(stages, notes)` so the timeline and the notes agree.
 */
export function HiringProcessTimeline({ view }: { view: ProcessView }) {
  const t = useTranslations('jobs.process');
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-foreground">{t('title')}</h2>

      {view.empty ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {view.rows.map((row, index) => {
            const meta = [
              row.format && t(`formats.${row.format}`),
              row.durationMinutes !== null && t('minutes', { count: row.durationMinutes }),
            ].filter(Boolean);
            return (
              <li key={row.id} className="space-y-2 rounded-card bg-surface-muted p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground shadow-card">
                  {index + 1}
                </span>
                <h3 className="font-display text-sm font-semibold text-foreground">{row.name}</h3>
                {row.description && (
                  <p className="text-xs leading-snug text-muted-foreground">{row.description}</p>
                )}
                {meta.length > 0 && (
                  <p className="flex items-center gap-1 font-mono text-xs text-subtle-foreground">
                    <Timer className="size-3.5" aria-hidden />
                    {meta.join(' · ')}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
