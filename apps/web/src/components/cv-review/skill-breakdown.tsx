import Link from 'next/link';
import {
  CheckCheck,
  CircleCheck,
  ClipboardCheck,
  Dumbbell,
  ExternalLink,
  Lightbulb,
  OctagonAlert,
  StarHalf,
  Wrench,
} from 'lucide-react';
import type { CvReview, MatchedSkill, SkillGap } from '@/components/cv-review/mock-cv-review';
import type { Job } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;
const articleClass =
  'rounded-card bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover';

function EvidenceCard({ item }: { item: MatchedSkill }) {
  return (
    <article className={cn(articleClass, 'space-y-2')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-success-subtle text-success">
            <CheckCheck className="size-4" {...iconProps} />
          </span>
          <div>
            <h4 className="font-display text-base font-semibold">{item.skill}</h4>
            <span className="text-xs font-medium text-success">{item.matchLabel}</span>
          </div>
        </div>
        <Badge>Trọng số: {item.weight}%</Badge>
      </div>
      <div className="space-y-1 rounded-card bg-surface-muted p-4">
        <div className="flex items-center gap-1 font-display text-sm font-semibold">
          <ClipboardCheck className="size-4 text-primary" {...iconProps} />
          Căn cứ trích xuất từ CV:
        </div>
        <p className="pl-5 text-xs text-muted-foreground">{item.evidence}</p>
      </div>
    </article>
  );
}

function GapCard({ gap, company }: { gap: SkillGap; company: string }) {
  const required = gap.priority === 'required';
  return (
    <article className={cn(articleClass, 'space-y-4')}>
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-control',
            required ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning',
          )}
        >
          {required ? (
            <OctagonAlert className="size-4" {...iconProps} />
          ) : (
            <StarHalf className="size-4" {...iconProps} />
          )}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-1">
            {required ? (
              <span className="rounded bg-danger px-1 py-0.5 text-xs font-bold text-primary-foreground uppercase">
                Bắt buộc
              </span>
            ) : (
              <span className="rounded bg-surface-strong px-1 py-0.5 text-xs font-semibold text-muted-foreground uppercase">
                Nên có
              </span>
            )}
            <h4 className="font-display text-base font-semibold">{gap.skill}</h4>
          </div>
          <span className="mt-0.5 inline-block text-xs text-subtle-foreground">
            Yêu cầu từ JD {company}: {gap.jdRequirement}
          </span>
        </div>
      </div>

      <div className="rounded-card bg-surface-muted p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Thực trạng hồ sơ:</strong> {gap.currentState}
        </p>
      </div>

      <div className="space-y-1 rounded-card bg-surface-strong p-4">
        <div className="flex items-center gap-1 font-display text-sm font-semibold text-primary">
          <Lightbulb className="size-4" {...iconProps} />
          Hành động khắc phục nhanh:
        </div>
        <p className="text-xs text-muted-foreground">{gap.quickFix}</p>
        {gap.resourceLabel && (
          <div className="pt-1">
            {/* Resource library is not built yet. */}
            <span className="inline-flex items-center gap-0.5 font-display text-sm font-semibold text-primary">
              {gap.resourceLabel}
              <ExternalLink className="size-3.5" {...iconProps} />
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export function SkillBreakdown({ review, job }: { review: CvReview; job: Job }) {
  return (
    <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <CircleCheck className="size-6 text-success" {...iconProps} />
            <h3 className="font-display text-xl font-semibold">
              Kỹ năng phù hợp & bằng chứng đối chiếu
            </h3>
          </div>
          <Badge tone="success" shape="pill" className="font-mono font-semibold">
            {String(review.matchedSkills.length).padStart(2, '0')} tiêu chí khớp cao
          </Badge>
        </div>
        {review.matchedSkills.map((item) => (
          <EvidenceCard key={item.skill} item={item} />
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <Wrench className="size-6 text-warning" {...iconProps} />
            <h3 className="font-display text-xl font-semibold">Kỹ năng còn thiếu & khuyến nghị</h3>
          </div>
          <Badge tone="danger" shape="pill" className="font-mono font-semibold">
            {String(review.gaps.length).padStart(2, '0')} điểm trọng yếu
          </Badge>
        </div>
        {review.gaps.map((gap) => (
          <GapCard key={gap.skill} gap={gap} company={job.company} />
        ))}

        <div className="flex flex-col items-start justify-between gap-4 rounded-card bg-surface-strong p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-surface text-primary shadow-card">
              <Dumbbell className="size-6" {...iconProps} />
            </span>
            <div>
              <h4 className="font-display text-sm font-semibold">
                Muốn bổ sung kỹ năng thiếu trong 48h?
              </h4>
              <p className="text-xs text-muted-foreground">
                Mở phòng luyện AI mô phỏng phỏng vấn tập trung vào câu hỏi State & Testing.
              </p>
            </div>
          </div>
          <Link
            href="/interview-practice"
            className={buttonClasses('primary', 'whitespace-nowrap')}
          >
            Tạo đề ôn
          </Link>
        </div>
      </div>
    </section>
  );
}
