import { Check } from 'lucide-react';
import type { CandidateApplicationDetail } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { isFinalStatus, StatusBadge } from '@/components/applications/status-badge';
import { cn } from '@/lib/cn';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Status history (oldest first) and the job's hiring rounds with the current one marked. */
export function ApplicationTimeline({ detail }: { detail: CandidateApplicationDetail }) {
  const stages = [...detail.stages].sort((a, b) => a.position - b.position);

  return (
    <div className="grid gap-6 border-t border-border pt-4 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground">Status history</h3>
        <ol aria-label="Status history" className="space-y-5">
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
                    {formatDate(item.changedAt)}
                  </span>
                </div>
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground">Hiring rounds</h3>
        {stages.length === 0 ? (
          <p className="text-xs text-muted-foreground">This job has no rounds yet.</p>
        ) : (
          <ol aria-label="Hiring rounds" className="space-y-2 text-sm">
            {stages.map((stage) => {
              const current = stage.name === detail.currentStageName;
              return (
                <li key={stage.id} className="flex flex-wrap items-center gap-2">
                  <span className={current ? 'font-semibold text-primary' : 'text-foreground'}>
                    {stage.name}
                  </span>
                  {current && (
                    <Badge tone="primary" shape="pill">
                      Current round
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
