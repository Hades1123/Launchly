import {
  BadgeCheck,
  BrainCircuit,
  ChartLine,
  CircleCheckBig,
  Lock,
  TriangleAlert,
  Lightbulb,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { MatchGauge } from '@/components/cv-review/match-gauge';
import type { CvReview } from '@/components/cv-review/mock-cv-review';
import { ProgressBar } from '@/components/cv-review/progress-bar';
import type { Job } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

const metricTones = {
  success: { tile: 'bg-success-subtle text-success', text: 'text-success' },
  warning: { tile: 'bg-warning-subtle text-warning', text: 'text-warning' },
  primary: { tile: 'bg-primary-subtle text-primary-subtle-foreground', text: 'text-primary' },
} as const;

type MetricCardProps = {
  icon: LucideIcon;
  tone: keyof typeof metricTones;
  status: string;
  value: ReactNode;
  title: string;
  note: string;
  progress: number;
};

function MetricCard({ icon: Icon, tone, status, value, title, note, progress }: MetricCardProps) {
  const t = metricTones[tone];
  return (
    <div className="flex flex-col justify-between rounded-card bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <span className={cn('flex size-12 items-center justify-center rounded-card', t.tile)}>
          <Icon className="size-6" {...iconProps} />
        </span>
        <span className={cn('rounded bg-surface-strong px-1 py-0.5 text-xs font-semibold', t.text)}>
          {status}
        </span>
      </div>
      <div className="mt-6">
        <div className="font-display text-3xl font-bold">{value}</div>
        <p className="mt-0.5 font-display text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>
      <ProgressBar value={progress} tone={tone} label={title} />
    </div>
  );
}

function Unit({ children }: { children: ReactNode }) {
  return (
    <span className="font-display text-sm font-normal text-subtle-foreground"> {children}</span>
  );
}

export function ScoreOverview({ review, job }: { review: CvReview; job: Job }) {
  const { matched, gaps, passRate } = review.summary;
  return (
    <section
      aria-label="Tổng quan điểm phù hợp"
      className="mt-2 mb-12 grid grid-cols-1 gap-6 lg:grid-cols-12"
    >
      <div className="relative flex flex-col justify-between overflow-hidden rounded-card bg-surface p-8 shadow-card-hover lg:col-span-6 xl:col-span-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-primary-subtle opacity-40 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-subtle-foreground uppercase">
              Tỉ số phù hợp tổng quan
            </span>
            <h2 className="mt-0.5 font-display text-2xl font-semibold">{review.verdict}</h2>
          </div>
          <Badge
            tone="success"
            shape="pill"
            className="px-4 py-1 font-display text-sm font-semibold"
          >
            <BadgeCheck className="size-4" {...iconProps} />
            {review.tier}
          </Badge>
        </div>

        <div className="relative flex flex-col items-center gap-8 py-6 sm:flex-row">
          <MatchGauge score={review.score} />
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1 rounded-control bg-secondary px-2 py-0.5 text-sm font-medium">
              <BrainCircuit className="size-4 text-primary" {...iconProps} />
              {review.model}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Đánh giá dựa trên {review.requirementCount} yêu cầu trong JD {job.company} và dữ liệu
              thực tế từ hồ sơ ứng viên. Điểm số mang tính tham khảo, định hướng.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-2 rounded-card bg-surface-muted p-4">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Lock className="size-5 text-success" {...iconProps} />
            Bảo mật tuyệt đối hồ sơ sinh viên
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-6 xl:col-span-7">
        <MetricCard
          icon={CircleCheckBig}
          tone="success"
          status={`${Math.round((matched.count / matched.total) * 100)}% đạt`}
          value={
            <>
              {matched.count}
              <Unit>/ {matched.total}</Unit>
            </>
          }
          title="Kỹ năng đã khớp"
          note={matched.note}
          progress={(matched.count / matched.total) * 100}
        />
        <MetricCard
          icon={TriangleAlert}
          tone="warning"
          status="Cần bổ sung"
          value={
            <>
              {gaps.count}
              <Unit>lỗ hổng</Unit>
            </>
          }
          title="Khoảng trống kỹ năng"
          note={gaps.note}
          progress={40}
        />
        <MetricCard
          icon={ChartLine}
          tone="primary"
          status="Độ tin cậy cao"
          value={
            <span className="text-primary">
              {passRate.percent}
              <Unit>%</Unit>
            </span>
          }
          title="Tỷ lệ qua vòng lọc hồ sơ"
          note={passRate.note}
          progress={passRate.percent}
        />

        <div className="flex flex-col items-start justify-between gap-4 rounded-card bg-surface-strong p-4 sm:col-span-3 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
              <Lightbulb className="size-5" {...iconProps} />
            </span>
            <div>
              <p className="font-display text-sm font-semibold">{review.benchmark.headline}</p>
              <p className="text-xs text-muted-foreground">{review.benchmark.detail}</p>
            </div>
          </div>
          <a
            href="#action-plan"
            className="rounded-control bg-surface px-4 py-2 font-display text-sm font-semibold whitespace-nowrap text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Xem {review.tips.length} bước nâng điểm →
          </a>
        </div>
      </div>
    </section>
  );
}
