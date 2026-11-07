import Link from 'next/link';
import {
  BrainCircuit,
  CalendarClock,
  CircleCheckBig,
  Eye,
  Layers,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { levelTone } from '@/components/applications/level-tone';
import type {
  Application,
  StatusIcon,
  StatusTone,
} from '@/components/applications/mock-applications';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

const statusIcons: Record<StatusIcon, LucideIcon> = {
  viewed: Eye,
  grading: RefreshCw,
  submitted: CircleCheckBig,
  interview: CalendarClock,
};

const toneText: Record<StatusTone, string> = {
  primary: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
};

function ApplicationCard({ application }: { application: Application }) {
  const { status } = application;
  const Icon = statusIcons[status.icon];

  return (
    <Link
      href={`/applications?application=${application.id}`}
      scroll={false}
      className="group flex flex-col gap-1 rounded-card bg-surface-muted p-4 shadow-card transition-all hover:bg-surface-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CompanyAvatar initials={application.companyInitials} />
          <div>
            <h3 className="font-display text-sm font-semibold group-hover:text-primary">
              {application.company}
            </h3>
            <span className="text-xs text-muted-foreground">{application.role}</span>
          </div>
        </div>
        <Badge tone={levelTone[application.level]} shape="pill">
          {application.level}
        </Badge>
      </div>

      <div className="mt-1 flex flex-col gap-0.5 rounded-control bg-surface p-2">
        <div
          className={cn(
            'flex items-center gap-1 font-display text-sm font-semibold',
            toneText[status.tone],
          )}
        >
          <Icon
            className={cn('size-4', status.icon === 'grading' && 'motion-safe:animate-spin')}
            {...iconProps}
          />
          {status.text}
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-subtle-foreground">
          <span>{status.detailLabel}</span>
          <span className="text-right font-semibold text-foreground">{status.detailValue}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-0.5 text-xs">
        <span className="text-subtle-foreground">{application.footnote}</span>
        <span className="font-display text-sm font-semibold text-primary group-hover:underline">
          Xem tiến trình →
        </span>
      </div>
    </Link>
  );
}

export function OtherApplications({ applications }: { applications: Application[] }) {
  return (
    <aside className="flex flex-col gap-6 lg:col-span-4">
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-1 font-display text-base font-semibold">
            <Layers className="size-5 text-primary" {...iconProps} />
            Hồ sơ đang nộp khác
          </h2>
          <span className="text-xs font-semibold text-subtle-foreground">
            {applications.length} công ty
          </span>
        </div>
        <div className="space-y-4">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
        <Link
          href="/jobs"
          className="mt-6 flex w-full items-center justify-center gap-1 rounded-control bg-surface-strong py-2 font-display text-sm font-semibold text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Search className="size-4" {...iconProps} />
          Tìm kiếm và nộp thêm việc làm mới
        </Link>
      </Card>

      <Card className="p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-foreground">
            <BrainCircuit className="size-4" {...iconProps} />
          </span>
          <h2 className="font-display text-sm font-semibold">Cố vấn định hướng AI</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Bạn có thắc mắc về cách đàm phán mức lương Fresher hoặc muốn kiểm tra hợp đồng thực tập
          trước khi ký kết?
        </p>
        <button
          type="button"
          disabled
          title="Sắp ra mắt"
          className={buttonClasses('ghost', 'mt-2 w-full cursor-not-allowed bg-surface-strong')}
        >
          Trò chuyện với AI Advisor
        </button>
      </Card>
    </aside>
  );
}
