import {
  BookOpen,
  Check,
  CircleCheck,
  CirclePlus,
  ClipboardCheck,
  GraduationCap,
  Laptop,
  Star,
  Terminal,
  Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Job } from '@/components/jobs/mock-jobs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;
const benefitIcons: LucideIcon[] = [Laptop, BookOpen, Utensils];

export function JobDescription({ job }: { job: Job }) {
  return (
    <Card className="space-y-8">
      <section className="space-y-2">
        <h2 className="flex items-center gap-1 font-display text-xl font-semibold">
          <Terminal className="size-5 text-primary" {...iconProps} />
          Trách nhiệm công việc (Bạn sẽ làm gì?)
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {job.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
        <section className="space-y-2 rounded-card bg-surface-muted p-4">
          <h3 className="flex items-center gap-1 font-display text-base font-semibold">
            <CircleCheck className="size-5 text-primary" {...iconProps} />
            Yêu cầu bắt buộc
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {job.requirements.map((item) => (
              <li key={item} className="flex items-start gap-1">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" {...iconProps} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-card bg-success-subtle/20 p-4">
          <h3 className="flex items-center gap-1 font-display text-base font-semibold">
            <CirclePlus className="size-5 text-success" {...iconProps} />
            Điểm cộng ưu tiên (+ Match Score)
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {job.niceToHave.map((item) => (
              <li key={item} className="flex items-start gap-1">
                <Star className="mt-0.5 size-4 shrink-0 text-success" {...iconProps} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="space-y-2 pt-1">
        <h2 className="flex items-center gap-1 font-display text-xl font-semibold">
          <GraduationCap className="size-5 text-success" {...iconProps} />
          Quyền lợi đào tạo & phát triển sự nghiệp
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {job.benefits.map((benefit, index) => {
            const Icon = benefitIcons[index % benefitIcons.length]!;
            return (
              <div key={benefit.title} className="space-y-1 rounded-card bg-surface-muted p-4">
                <div className="flex items-center gap-1 font-display text-sm font-semibold text-primary">
                  <Icon className="size-5" {...iconProps} />
                  {benefit.title}
                </div>
                <p className="text-xs text-muted-foreground">{benefit.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col items-center justify-between gap-4 rounded-card bg-secondary/80 p-4 sm:flex-row">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="font-display text-sm font-semibold">
            Sẵn sàng phát triển sự nghiệp cùng {job.company}?
          </p>
          <p className="text-xs text-muted-foreground">
            Hạn chót tiếp nhận hồ sơ:{' '}
            <span className="font-semibold text-foreground">{job.deadline}</span> (còn lại{' '}
            {job.daysLeft} ngày)
          </p>
        </div>
        <Button variant="primary" className="w-full px-8 sm:w-auto">
          <ClipboardCheck className="size-5" {...iconProps} />
          Nộp hồ sơ ngay
        </Button>
      </div>
    </Card>
  );
}
