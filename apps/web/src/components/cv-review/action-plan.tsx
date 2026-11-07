import Link from 'next/link';
import { ChevronRight, Download, Mic, Rocket, Send, Sparkles, TrendingUp } from 'lucide-react';
import type { CvReview } from '@/components/cv-review/mock-cv-review';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

export function ActionPlan({ review }: { review: CvReview }) {
  return (
    <section
      id="action-plan"
      aria-labelledby="action-plan-title"
      className="mb-12 scroll-mt-24 rounded-card bg-surface p-6 shadow-card-hover md:p-8"
    >
      <div className="mb-8 flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-1 font-display text-sm font-semibold tracking-wider text-primary uppercase">
            <Sparkles className="size-5" {...iconProps} />
            AI Growth Sprint
          </div>
          <h3 id="action-plan-title" className="mt-0.5 font-display text-2xl font-semibold">
            {review.tips.length} gợi ý hành động tức thì để nâng điểm từ {review.score} lên{' '}
            {review.targetScore}/100
          </h3>
        </div>
        <Badge
          tone="success"
          shape="pill"
          className="self-start px-4 py-1 text-sm font-semibold md:self-auto"
        >
          <TrendingUp className="size-4" {...iconProps} />
          Dự kiến tăng {review.expectedGain} điểm ATS
        </Badge>
      </div>

      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {review.tips.map((tip, index) => (
          <li
            key={tip.title}
            className="flex flex-col justify-between space-y-4 rounded-card bg-surface-muted p-6 transition-colors hover:bg-surface-strong"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">
                  {tip.impact}
                </span>
              </div>
              <h4 className="font-display text-base font-semibold">{tip.title}</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 self-start rounded-control font-display text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {tip.cta}
              <ChevronRight className="size-4" {...iconProps} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ApplyBar({ review }: { review: CvReview }) {
  return (
    <section className="flex flex-col items-center justify-between gap-6 rounded-card bg-surface p-6 shadow-card-hover lg:flex-row">
      <div className="flex w-full items-center gap-4 lg:w-auto">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-success-subtle text-success">
          <Rocket className="size-7" {...iconProps} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <h4 className="font-display text-base font-semibold">
              Sẵn sàng ứng tuyển cho vị trí này?
            </h4>
            <Badge tone="success" className="font-semibold">
              Match {review.score}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            CV đã đủ điều kiện an toàn để gửi đi, hoặc bạn có thể tối ưu nhanh trong 5 phút.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:w-auto">
        <Button variant="icon" className="px-6 py-3">
          <Download className="size-5" {...iconProps} />
          Áp dụng & xuất CV tối ưu
        </Button>
        <Link href="/interview-practice" className={buttonClasses('soft', 'px-6 py-3')}>
          <Mic className="size-5" {...iconProps} />
          Luyện phỏng vấn AI ngay
        </Link>
        <Button variant="primary" className="px-8 py-3">
          <Send className="size-5" {...iconProps} />
          Tiến hành nộp hồ sơ
        </Button>
      </div>
    </section>
  );
}
