import { BadgeCheck, ChartColumn, CircleCheck, TrendingUp } from 'lucide-react';
import type {
  InterviewSession,
  StarPillar,
} from '@/components/interview-practice/mock-interview-session';
import { RichText } from '@/components/interview-practice/rich-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;
const ringPath = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      role="img"
      aria-label={`Điểm ${score} trên 10`}
      className="relative flex size-24 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
        <path
          d={ringPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-secondary"
        />
        <path
          d={ringPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${score * 10}, 100`}
          className="text-success"
        />
      </svg>
      <div aria-hidden className="absolute flex flex-col items-center">
        <span className="font-display text-3xl leading-none font-bold">{score.toFixed(1)}</span>
        <span className="font-mono text-xs text-subtle-foreground">/ 10</span>
      </div>
    </div>
  );
}

const letterTone = {
  success: 'bg-success-subtle text-success',
  primary: 'bg-primary-subtle text-primary-subtle-foreground',
  warning: 'bg-warning-subtle text-warning',
} as const;

const scoreTone = {
  success: 'text-success',
  primary: 'text-primary',
  warning: 'text-warning',
} as const;

function PillarRow({ pillar }: { pillar: StarPillar }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-control bg-surface-muted p-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span
            aria-hidden
            className={cn(
              'flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold',
              letterTone[pillar.tone],
            )}
          >
            {pillar.letter}
          </span>
          <span className="font-display text-sm font-semibold">{pillar.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn('font-mono text-xs font-bold', scoreTone[pillar.tone])}>
            {pillar.score.toFixed(1)}
          </span>
          <Badge tone={pillar.tone}>{pillar.verdict}</Badge>
        </div>
      </div>
      <p className="pl-8 text-xs text-muted-foreground">
        <RichText segments={pillar.note} />
      </p>
    </li>
  );
}

const sectionLabel = 'text-xs font-semibold tracking-wider text-subtle-foreground uppercase';

/** Right column: instant STAR scoring, detected keywords and the company's golden answer. */
export function FeedbackPanel({ session }: { session: InterviewSession }) {
  const { feedback } = session;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ChartColumn className="size-5 text-primary" {...iconProps} />
          <h2 className="font-display text-xl font-semibold">Đánh giá tức thì (AI STAR)</h2>
        </div>
        <Badge tone="success" shape="pill" className="font-semibold">
          {feedback.verdict}
        </Badge>
      </div>

      <div className="flex items-center gap-6 rounded-card bg-surface-muted p-4">
        <ScoreRing score={feedback.score} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="font-display text-base font-semibold">{feedback.headline}</span>
          <p className="text-xs leading-relaxed text-muted-foreground">{feedback.summary}</p>
          <span className="flex items-center gap-1 pt-0.5 text-xs font-medium text-success">
            <TrendingUp className="size-4" {...iconProps} />
            {feedback.percentile}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-2 pt-1">
        <h3 className={sectionLabel}>Chi tiết cấu trúc mô hình STAR</h3>
        <ul className="flex flex-col gap-2">
          {feedback.pillars.map((pillar) => (
            <PillarRow key={pillar.letter} pillar={pillar} />
          ))}
        </ul>
      </section>

      <section className="space-y-1 pt-1">
        <h3 className={sectionLabel}>Từ khóa chuyên môn được AI ghi nhận</h3>
        <ul className="flex flex-wrap gap-1">
          {feedback.keywords.map((keyword) => (
            <li
              key={keyword}
              className="flex items-center gap-1 rounded bg-secondary px-2 py-1 font-mono text-xs shadow-card"
            >
              <CircleCheck className="size-3.5 text-success" {...iconProps} />
              {keyword}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-1 flex flex-col gap-1 rounded-card bg-primary-subtle p-4">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <h3 className="flex items-center gap-1 font-display text-sm font-semibold text-primary-subtle-foreground">
            <BadgeCheck className="size-4" {...iconProps} />
            Câu trả lời vàng (Golden Response)
          </h3>
          <span className="rounded bg-surface px-1 py-0.5 text-xs font-medium text-primary">
            {feedback.goldenResponse.source}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-foreground">
          <RichText segments={feedback.goldenResponse.text} />
        </p>
      </section>
    </Card>
  );
}
