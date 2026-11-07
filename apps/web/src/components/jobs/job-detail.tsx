import {
  BadgeCheck,
  Bookmark,
  BrainCircuit,
  Building2,
  Clock,
  Code,
  Languages,
  Lightbulb,
  MailCheck,
  MapPin,
  Route,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { JobDescription } from '@/components/jobs/job-description';
import type { Job } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

function SectionTitle({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: 'primary' | 'success';
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon
        className={cn('size-5', tone === 'primary' ? 'text-primary' : 'text-success')}
        {...iconProps}
      />
      <h2 className="font-display text-xl font-semibold">{children}</h2>
    </div>
  );
}

function DetailHeader({ job }: { job: Job }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <CompanyAvatar initials={job.companyInitials} size="lg" />
          <div className="space-y-0.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-0.5 font-display font-semibold text-foreground">
                <Building2 className="size-4 text-primary" {...iconProps} />
                {job.company}
              </span>
              <span className="flex items-center gap-0.5">
                <MapPin className="size-4 text-subtle-foreground" {...iconProps} />
                {job.address}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="size-4 text-subtle-foreground" {...iconProps} />
                {job.schedule}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-end justify-between rounded-card bg-surface-muted p-2 md:flex-col md:justify-center">
          <span className="text-xs font-semibold text-subtle-foreground">
            Lương công khai minh bạch
          </span>
          <span className="font-display text-xl font-bold text-primary">
            {job.salaryShort}{' '}
            <span className="font-sans text-xs font-semibold text-muted-foreground">VNĐ/tháng</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface-muted p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">
            <Send className="size-5" {...iconProps} />
            Ứng tuyển nhanh (1 chạm)
          </Button>
          <Button variant="soft">
            <BrainCircuit className="size-5 text-primary" {...iconProps} />
            AI kiểm tra độ phù hợp CV
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="icon" aria-label="Lưu tin">
            <Bookmark className="size-5" {...iconProps} />
          </Button>
          <Button variant="icon" aria-label="Chia sẻ JD">
            <Share2 className="size-5" {...iconProps} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  label,
  icon: Icon,
  value,
  note,
  valueClass,
}: {
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  note: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col justify-between space-y-1 rounded-card bg-surface-muted p-4">
      <div className="flex items-center justify-between text-subtle-foreground">
        <span className="text-xs font-semibold">{label}</span>
        <Icon className="size-4" {...iconProps} />
      </div>
      <div>
        <div className={cn('font-display text-xl font-bold', valueClass)}>{value}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
    </div>
  );
}

function TransparencyMetrics({ job }: { job: Job }) {
  const t = job.transparency;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={BadgeCheck} tone="success">
          Chỉ số minh bạch tuyển dụng
        </SectionTitle>
        <Badge tone="success" shape="pill" className="font-semibold">
          <Shield className="size-3.5" {...iconProps} />
          Doanh nghiệp đạt chuẩn Launchly Gold
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Thời gian phản hồi"
          icon={Timer}
          value={t.responseTime}
          valueClass="text-primary"
          note={
            <span className="flex items-center gap-0.5 text-success">
              <TrendingUp className="size-3.5" {...iconProps} />
              {t.responseTimeNote}
            </span>
          }
        />
        <Metric
          label="Tỷ lệ phản hồi CV"
          icon={MailCheck}
          value={t.responseRate}
          note="Cam kết có phản hồi 100%"
        />
        <Metric
          label="Xác minh quy trình"
          icon={ShieldCheck}
          value={t.verified ? 'Đã kiểm duyệt' : 'Chưa kiểm duyệt'}
          valueClass={t.verified ? 'text-success' : 'text-warning'}
          note="Bởi Launchly Auditing"
        />
        <Metric
          label="Đánh giá ứng viên"
          icon={Star}
          value={
            <>
              {t.rating.toFixed(1)}{' '}
              <span className="font-sans text-sm font-medium text-subtle-foreground">/ 5.0</span>
            </>
          }
          note={`${t.ratingCount} lượt đánh giá ẩn danh`}
        />
      </div>
    </Card>
  );
}

function HiringProcess({ job }: { job: Job }) {
  const last = job.steps.length - 1;
  return (
    <Card className="space-y-4">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div>
          <SectionTitle icon={Route} tone="primary">
            Lộ trình {job.steps.length} vòng tuyển dụng chuẩn hóa
          </SectionTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ứng viên biết chính xác hình thức, thời lượng và tiêu chí chấm điểm trước khi nộp đơn.
          </p>
        </div>
        <span className="rounded bg-surface-strong px-2 py-0.5 font-mono text-xs text-primary">
          Tổng quy trình: {job.processDuration}
        </span>
      </div>

      <ol className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-4">
        {job.steps.map((step, index) => {
          const isFinal = index === last;
          return (
            <li
              key={step.title}
              className="flex flex-col justify-between space-y-2 rounded-card bg-surface-muted p-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full font-display text-sm font-bold shadow-card',
                    isFinal
                      ? 'bg-success text-primary-foreground'
                      : 'bg-primary text-primary-foreground',
                  )}
                >
                  {index + 1}
                </span>
                <Badge tone={isFinal ? 'success' : 'primary'}>{step.format}</Badge>
              </div>
              <div className="space-y-0.5">
                <h3 className="font-display text-sm font-semibold">{step.title}</h3>
                <p className="text-xs leading-snug text-muted-foreground">{step.description}</p>
              </div>
              <div className="flex items-center gap-0.5 pt-1 font-mono text-xs text-subtle-foreground">
                <Timer className="size-3.5" {...iconProps} />
                {step.duration}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

const tipIcons: LucideIcon[] = [Code, Sparkles, Languages];

function TeamTips({ job }: { job: Job }) {
  return (
    <section className="space-y-2 rounded-card bg-primary-subtle p-6 shadow-card">
      <div className="flex items-center gap-1 text-primary-subtle-foreground">
        <Lightbulb className="size-6" {...iconProps} />
        <h2 className="font-display text-xl font-bold">
          Lời khuyên từ đội ngũ kỹ thuật {job.company}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Để ứng viên tự tin và không bị bỡ ngỡ, đội ngũ tuyển dụng chia sẻ {job.tips.length} trọng
        tâm cần chuẩn bị:
      </p>
      <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-3">
        {job.tips.map((tip, index) => {
          const Icon = tipIcons[index % tipIcons.length]!;
          return (
            <div
              key={tip.title}
              className="space-y-0.5 rounded-control bg-surface/80 p-4 shadow-card"
            >
              <div className="flex items-center gap-0.5 font-display text-sm font-semibold text-primary">
                <Icon className="size-4" {...iconProps} />
                {tip.title}
              </div>
              <p className="text-xs text-muted-foreground">{tip.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function JobDetail({ job }: { job: Job }) {
  return (
    <div className="flex flex-col gap-6">
      <DetailHeader job={job} />
      <TransparencyMetrics job={job} />
      <HiringProcess job={job} />
      <TeamTips job={job} />
      <JobDescription job={job} />
    </div>
  );
}
