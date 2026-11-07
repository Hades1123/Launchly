import { ArrowRight, Flag } from 'lucide-react';
import { actionButtonClasses } from '@/components/interview-practice/action-button';
import type { InterviewSession } from '@/components/interview-practice/mock-interview-session';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

/** Sticky deck: question progress dots and next/finish actions. */
export function SessionFooter({ session }: { session: InterviewSession }) {
  const { currentQuestion, totalQuestions } = session;
  const next = currentQuestion + 1;

  return (
    <div className="sticky bottom-0 z-40 w-full bg-surface shadow-card-hover">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row md:px-8">
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <ol aria-label="Tiến độ câu hỏi" className="flex items-center gap-1">
            {Array.from({ length: totalQuestions }, (_, index) => {
              const number = index + 1;
              const state =
                number < currentQuestion ? 'done' : number === currentQuestion ? 'current' : 'todo';
              return (
                <li
                  key={number}
                  aria-current={state === 'current' ? 'step' : undefined}
                  aria-label={`Câu ${number}`}
                  className={cn(
                    'size-3 rounded-full',
                    state === 'done' && 'bg-success',
                    state === 'current' && 'bg-primary ring-4 ring-primary/20',
                    state === 'todo' && 'bg-secondary',
                  )}
                />
              );
            })}
          </ol>
          <div className="flex flex-col">
            <span className="font-display text-sm font-semibold">
              Đang ở câu hỏi {currentQuestion} / {totalQuestions}
            </span>
            <span className="text-xs text-subtle-foreground">
              Kế tiếp: {session.nextQuestionTopic}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <button type="button" className={actionButtonClasses('neutral')}>
            <Flag className="size-4" {...iconProps} />
            Kết thúc & xem báo cáo tổng thể
          </button>
          <Button variant="primary" className="px-6">
            Câu hỏi tiếp theo (Câu {next})
            <ArrowRight className="size-5" {...iconProps} />
          </Button>
        </div>
      </div>
    </div>
  );
}
