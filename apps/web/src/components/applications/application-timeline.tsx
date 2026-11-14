import { Check } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { CandidateApplicationDetail } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { isFinalStatus, StatusBadge } from '@/components/applications/status-badge';
import { cn } from '@/lib/cn';

/** Short date used across the applications list, formatted in the active locale. */
export const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

/** Status history (oldest first) and the job's hiring rounds with the current one marked. */
export function ApplicationTimeline({ detail }: { detail: CandidateApplicationDetail }) {
  const t = useTranslations('candidate.applications.timeline');
  const format = useFormatter();
  const stages = [...detail.stages].sort((a, b) => a.position - b.position);

  return (
    <div className="grid gap-6 border-t border-border pt-4 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground">{t('statusHistory')}</h3>
        <ol aria-label={t('statusHistory')} className="space-y-5">
          {detail.history.map((item, index) => {
            const isLast = index === detail.history.length - 1;
            return (
              <li
                key={`${index}-${item.changedAt}`}
                aria-current={isLast ? 'step' : undefined}
                className="relative space-y-1 pl-8"
              >
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-6 -bottom-5 left-2.25 border-l-2 border-success"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-0.5 left-0 flex size-5 items-center justify-center rounded-full text-primary-foreground',
                    !isLast && 'bg-success',
                    isLast &&
                      !isFinalStatus(item.toStatus) &&
                      'bg-primary ring-4 ring-primary-subtle',
                    isLast && isFinalStatus(item.toStatus) && 'bg-danger ring-4 ring-danger-subtle',
                  )}
                >
                  {!isLast && <Check className="size-3.5" strokeWidth={2} />}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.toStatus} />
                  <span className="font-mono text-xs text-subtle-foreground">
                    {format.dateTime(new Date(item.changedAt), DATE_FORMAT)}
                  </span>
                </div>
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground">{t('hiringRounds')}</h3>
        {stages.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('noRounds')}</p>
        ) : (
          <ol aria-label={t('hiringRounds')} className="space-y-2 text-sm">
            {stages.map((stage) => {
              const current = stage.name === detail.currentStageName;
              return (
                <li key={stage.id} className="flex flex-wrap items-center gap-2">
                  <span className={current ? 'font-semibold text-primary' : 'text-foreground'}>
                    {stage.name}
                  </span>
                  {current && (
                    <Badge tone="primary" shape="pill">
                      {t('currentRound')}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
