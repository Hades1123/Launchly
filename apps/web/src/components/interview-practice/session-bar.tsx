import { BadgeCheck, BrainCircuit, Timer } from 'lucide-react';
import { CountdownTimer } from '@/components/interview-practice/countdown-timer';
import type { InterviewSession } from '@/components/interview-practice/mock-interview-session';
import { Badge } from '@/components/ui/badge';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;
const pill = 'flex items-center gap-1 rounded-control bg-surface px-2 py-1 shadow-card';

/** Session context strip: role, real question bank source, round, progress and timer. */
export function SessionBar({ session }: { session: InterviewSession }) {
  return (
    <section aria-label="Thông tin phiên phỏng vấn" className="w-full bg-surface-muted shadow-card">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-2 md:px-8 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <div className={pill}>
            <span className="size-2.5 rounded-full bg-success motion-safe:animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-success uppercase">
              Live session
            </span>
            <span className="font-display text-sm font-semibold">{session.role}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-control bg-primary-subtle px-2 py-1 text-primary-subtle-foreground shadow-card">
            <BadgeCheck className="size-4" {...iconProps} />
            <span className="text-xs font-medium">
              Bộ đề phỏng vấn thực tế: <strong className="font-semibold">{session.company}</strong>
            </span>
            <span className="hidden rounded bg-surface/80 px-1 py-0.5 font-mono text-xs sm:inline-block">
              {session.questionBankSize} câu hỏi · {session.anonymisedCandidates} cựu ứng viên (đã
              ẩn danh)
            </span>
          </div>

          <Badge tone="warning" shape="pill">
            Dữ liệu minh họa, chưa kết nối API
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
          <div className={pill}>
            <BrainCircuit className="size-4 text-primary" {...iconProps} />
            <span className="font-display text-sm font-semibold">{session.round}</span>
            <Badge tone="success" className="font-semibold">
              {session.level}
            </Badge>
          </div>

          <div className="flex items-center gap-2 rounded-control bg-surface px-4 py-1 shadow-card">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-subtle-foreground uppercase">
                Tiến độ câu hỏi
              </span>
              <span className="font-display text-sm font-bold text-primary">
                {session.currentQuestion}{' '}
                <span className="font-normal text-muted-foreground">
                  / {session.totalQuestions}
                </span>
              </span>
            </div>
            <span aria-hidden className="h-6 w-px bg-secondary" />
            <div className="flex items-center gap-1">
              <Timer className="size-4 text-danger motion-safe:animate-pulse" {...iconProps} />
              <CountdownTimer
                initialSeconds={session.secondsLeft}
                totalSeconds={session.secondsTotal}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
