import { CalendarClock, Check, Lock, Play, Video } from 'lucide-react';
import type { ApplicationStage } from '@/components/applications/mock-applications';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 2, 'aria-hidden': true } as const;

const statusText = {
  completed: 'Đã hoàn thành',
  current: 'Đang diễn ra',
  pending: 'Chưa bắt đầu',
} as const;

function StageDot({ status }: { status: ApplicationStage['status'] }) {
  if (status === 'completed') {
    return (
      <span className="absolute top-1 left-0 flex size-5 items-center justify-center rounded-full bg-success text-primary-foreground shadow-card">
        <Check className="size-3.5" {...iconProps} />
      </span>
    );
  }
  if (status === 'current') {
    return (
      <span className="absolute top-4 left-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card-hover ring-4 ring-primary-subtle motion-safe:animate-pulse">
        <Play className="size-3" {...iconProps} />
      </span>
    );
  }
  return (
    <span className="absolute top-1 left-0 flex size-5 items-center justify-center rounded-full bg-surface-strong text-subtle-foreground">
      <Lock className="size-3" {...iconProps} />
    </span>
  );
}

/**
 * Vertical pipeline: completed stages use the success accent with a solid connector, the
 * current stage is highlighted in primary, pending stages are muted with a dashed connector.
 */
export function ApplicationStepper({ stages }: { stages: ApplicationStage[] }) {
  const last = stages.length - 1;

  return (
    <ol className="space-y-6">
      {stages.map((stage, index) => {
        const isCurrent = stage.status === 'current';
        return (
          <li key={stage.title} className="relative pl-8">
            {index < last && (
              <span
                aria-hidden
                className={cn(
                  'absolute -bottom-7 left-2.25 border-l-2',
                  isCurrent ? 'top-9' : 'top-6',
                  stage.status === 'completed' ? 'border-success' : 'border-dashed border-input',
                )}
              />
            )}
            <StageDot status={stage.status} />
            <span className="sr-only">{statusText[stage.status]}: </span>

            {isCurrent ? (
              <div className="rounded-card bg-surface p-4 shadow-card">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <span className="font-display text-base font-bold text-primary">
                    {stage.title}
                  </span>
                  <span className="w-fit rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    Đang diễn ra
                  </span>
                </div>
                {stage.appointment ? (
                  <>
                    <div className="mt-1 flex flex-col justify-between gap-2 rounded-control bg-secondary/60 p-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-1 font-display text-sm font-semibold">
                        <CalendarClock
                          className="size-5 shrink-0 text-primary"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {stage.appointment.time}
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Video
                          className="size-4 shrink-0 text-subtle-foreground"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {stage.appointment.channel}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Người phỏng vấn:</span>{' '}
                      {stage.appointment.interviewers}
                    </p>
                  </>
                ) : (
                  stage.note && <p className="mt-1 text-xs text-muted-foreground">{stage.note}</p>
                )}
              </div>
            ) : (
              <div className={cn(stage.status === 'pending' && 'text-muted-foreground')}>
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <span
                    className={cn(
                      'font-display text-sm font-semibold',
                      stage.status === 'completed' && 'text-foreground',
                    )}
                  >
                    {stage.title}
                  </span>
                  <span className="font-mono text-xs text-subtle-foreground">{stage.date}</span>
                </div>
                {(stage.resultLabel || stage.note) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {stage.resultLabel && (
                      <span className="rounded bg-surface-strong px-1 py-0.5 font-semibold text-success">
                        {stage.resultLabel}
                      </span>
                    )}
                    {stage.note && <span>{stage.note}</span>}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
