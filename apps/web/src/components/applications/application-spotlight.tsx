import Link from 'next/link';
import { ArrowRight, Bot, CalendarCog, CalendarPlus, Route, UserCheck } from 'lucide-react';
import { ApplicationStepper } from '@/components/applications/application-stepper';
import { levelTone } from '@/components/applications/level-tone';
import type { Application } from '@/components/applications/mock-applications';
import { PrepChecklist } from '@/components/applications/prep-checklist';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

const secondaryAction =
  'inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors ' +
  'hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

export function ApplicationSpotlight({ application }: { application: Application }) {
  const { stages } = application;
  const completed = stages.filter((stage) => stage.status === 'completed').length;
  const current = stages.find((stage) => stage.status === 'current');
  const currentIndex = current ? stages.indexOf(current) + 1 : undefined;

  return (
    <article className="relative overflow-hidden rounded-card bg-surface p-6 shadow-card-hover md:p-8">
      <div className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-card bg-primary px-4 py-0.5 text-xs font-semibold tracking-wider text-primary-foreground uppercase">
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-success-subtle opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-success-subtle" />
        </span>
        Tâm điểm ứng tuyển
      </div>

      <div className="mt-4 mb-6 flex flex-col items-start justify-between gap-4 sm:mt-0 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <CompanyAvatar initials={application.companyInitials} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-1">
              <h2 className="font-display text-xl font-semibold">{application.company}</h2>
              <Badge tone={levelTone[application.level]} shape="pill">
                {application.level}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {application.jobId ? (
                <Link
                  href={`/jobs?job=${application.jobId}`}
                  className="hover:text-primary hover:underline"
                >
                  {application.role}
                </Link>
              ) : (
                <span>{application.role}</span>
              )}
              <span aria-hidden>•</span>
              <span>{application.location}</span>
            </div>
          </div>
        </div>
        <div className="rounded-card bg-primary-subtle px-4 py-1 sm:text-right">
          <span className="block text-xs font-semibold tracking-wide text-primary-subtle-foreground uppercase">
            Trạng thái hiện tại
          </span>
          <span className="font-display text-base font-bold text-primary-subtle-foreground uppercase">
            {application.currentStageLabel}
          </span>
        </div>
      </div>

      <section className="mb-6 rounded-card bg-surface-muted p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1 font-display text-sm font-semibold tracking-wider uppercase">
            <Route className="size-5 text-primary" {...iconProps} />
            Lộ trình tuyển dụng thời gian thực
          </h3>
          <span className="font-mono text-xs font-semibold text-success">
            {completed}/{stages.length} vòng hoàn tất
          </span>
        </div>
        <ApplicationStepper stages={stages} />
      </section>

      <div className="mb-6 space-y-4">
        {current?.appointment && (
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold">Hộp công cụ tương tác lịch hẹn</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">
                <UserCheck className="size-4" {...iconProps} />
                Xác nhận tham gia
              </Button>
              <button type="button" className={cn(secondaryAction, 'bg-secondary text-foreground')}>
                <CalendarCog className="size-4" {...iconProps} />
                Yêu cầu đổi lịch phỏng vấn
              </button>
              <button
                type="button"
                className={cn(secondaryAction, 'bg-surface-strong text-muted-foreground')}
              >
                <CalendarPlus className="size-4" {...iconProps} />
                Thêm vào Google Calendar
              </button>
            </div>
          </section>
        )}

        {application.mockQuestionCount ? (
          <div className="flex flex-col items-start justify-between gap-4 rounded-card bg-linear-to-r from-primary-subtle to-secondary p-4 md:flex-row md:items-center">
            <div className="flex items-start gap-2">
              <span className="flex items-center justify-center rounded-control bg-primary p-1 text-primary-foreground">
                <Bot className="size-6" {...iconProps} />
              </span>
              <div>
                <h3 className="font-display text-base leading-tight font-semibold text-primary-subtle-foreground">
                  Luyện phỏng vấn AI cho vòng {currentIndex ?? 'tiếp theo'} ngay
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AI đã tổng hợp{' '}
                  <span className="font-semibold text-foreground">
                    {application.mockQuestionCount} câu hỏi thực tế
                  </span>{' '}
                  thường gặp ở vị trí này tại {application.company}.
                </p>
              </div>
            </div>
            <Link
              href="/interview-practice"
              className={buttonClasses('primary', 'whitespace-nowrap')}
            >
              Vào phòng luyện AI
              <ArrowRight className="size-4" {...iconProps} />
            </Link>
          </div>
        ) : null}
      </div>

      {application.checklist && currentIndex && (
        <PrepChecklist
          // Remount when switching applications so local checkbox state resets.
          key={application.id}
          title={`Checklist chuẩn bị cho vòng ${currentIndex}`}
          items={application.checklist}
        />
      )}
    </article>
  );
}
