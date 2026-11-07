import {
  CalendarDays,
  Eye,
  FileQuestion,
  Gauge,
  List,
  RefreshCw,
  SquareKanban,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { candidate, overviewMetrics } from '@/components/applications/mock-applications';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

type MetricTileProps = {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  value: string;
  valueClass?: string;
  note: string;
  noteClass?: string;
  highlight?: boolean;
};

function MetricTile({
  label,
  icon: Icon,
  iconClass,
  value,
  valueClass,
  note,
  noteClass,
  highlight,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-control p-2 md:p-4',
        highlight ? 'bg-primary text-primary-foreground' : 'bg-surface-muted',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-0.5 text-xs font-semibold',
          highlight ? 'text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        <Icon className={cn('size-4', iconClass)} {...iconProps} />
        {label}
      </span>
      <span
        className={cn(
          'mt-1 text-3xl font-bold',
          highlight ? 'font-mono' : 'font-display',
          valueClass,
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'text-xs',
          noteClass ?? (highlight ? 'text-primary-foreground' : 'text-subtle-foreground'),
        )}
      >
        {note}
      </span>
    </div>
  );
}

const views = [
  { label: 'Danh sách chi tiết & stepper', icon: List, active: true },
  { label: 'Thẻ tiến trình (Kanban)', icon: SquareKanban, active: false },
  { label: 'Lịch phỏng vấn', icon: CalendarDays, active: false },
];

export function ApplicationOverview({ activeCount }: { activeCount: number }) {
  const m = overviewMetrics;
  return (
    <Card className="mb-8 p-4 md:p-8">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <Badge tone="success" shape="pill">
              Ứng tuyển chủ động
            </Badge>
            <span className="font-mono text-xs text-subtle-foreground">
              ID: {candidate.profileId}
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Chào {candidate.name} 👋
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Bạn đang có{' '}
            <span className="font-display font-semibold text-primary">{activeCount} vị trí</span>{' '}
            đang tiến hành. Từng bước tuyển dụng đều được đo lường và dự báo minh bạch.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
          <MetricTile
            label="Phỏng vấn"
            icon={CalendarDays}
            iconClass="text-primary"
            value={m.interviews.value}
            valueClass="text-primary"
            note={m.interviews.note}
            noteClass="text-success"
          />
          <MetricTile
            label="Đã xem CV"
            icon={Eye}
            iconClass="text-success"
            value={m.cvViewed.value}
            note={m.cvViewed.note}
          />
          <MetricTile
            label="Chấm bài test"
            icon={FileQuestion}
            iconClass="text-warning"
            value={m.testsGrading.value}
            note={m.testsGrading.note}
          />
          <MetricTile
            label="Tốc độ phản hồi"
            icon={Gauge}
            iconClass=""
            value={m.responseSpeed.value}
            note={m.responseSpeed.note}
            highlight
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4">
        <div
          role="group"
          aria-label="Chế độ xem"
          className="inline-flex flex-wrap gap-0.5 rounded-control bg-surface-strong p-0.5"
        >
          {views.map(({ label, icon: Icon, active }) => (
            <span
              key={label}
              aria-current={active ? 'true' : undefined}
              aria-disabled={active ? undefined : true}
              title={active ? undefined : 'Sắp ra mắt'}
              className={cn(
                'flex items-center gap-1 rounded px-4 py-1 font-display text-sm font-semibold',
                active
                  ? 'bg-surface text-primary shadow-card'
                  : 'cursor-not-allowed text-muted-foreground',
              )}
            >
              <Icon className="size-4" {...iconProps} />
              {label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-subtle-foreground">
          <RefreshCw className="size-4" {...iconProps} />
          Tự động đồng bộ với hệ thống ATS lúc {candidate.lastSync}
        </div>
      </div>
    </Card>
  );
}
