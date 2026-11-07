import { GraduationCap, Lightbulb, Smile, TrendingUp } from 'lucide-react';
import type { ArchivedFeedback } from '@/components/applications/mock-applications';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

/** Constructive feedback from closed applications, kept so candidates can learn from each attempt. */
export function FeedbackLog({ feedback }: { feedback: ArchivedFeedback }) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning">
            <Lightbulb className="size-5" {...iconProps} />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">
              Nhật ký phản hồi & rút kinh nghiệm
            </h2>
            <p className="text-xs text-muted-foreground">
              Phản hồi xây dựng từ nhà tuyển dụng giúp bạn hoàn thiện kỹ năng sau mỗi lần thử sức.
            </p>
          </div>
        </div>
        <Badge>Đã lưu trữ</Badge>
      </div>

      <div className="flex flex-col gap-4 rounded-card bg-surface-muted p-4 md:flex-row">
        <CompanyAvatar initials={feedback.companyInitials} />
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="font-display text-sm font-semibold">
              {feedback.company} - {feedback.role}
            </span>
            <span className="font-mono text-xs text-subtle-foreground">{feedback.closedAgo}</span>
          </div>
          <div className="rounded-control bg-surface p-2">
            <div className="mb-0.5 flex items-center gap-1 font-display text-sm font-semibold text-success">
              <Smile className="size-4" {...iconProps} />
              Điểm sáng ghi nhận
            </div>
            <p className="text-xs text-muted-foreground">“{feedback.strengths}”</p>
            <div className="mt-2 mb-0.5 flex items-center gap-1 font-display text-sm font-semibold text-warning">
              <TrendingUp className="size-4" {...iconProps} />
              Gợi ý nâng cấp cho lần sau
            </div>
            <p className="text-xs text-muted-foreground">“{feedback.improvements}”</p>
          </div>
          <span
            aria-disabled="true"
            title="Sắp ra mắt"
            className="flex w-fit cursor-not-allowed items-center gap-0.5 pt-1 font-display text-sm font-semibold text-primary"
          >
            <GraduationCap className="size-4" {...iconProps} />
            Xem lộ trình khắc phục lỗ hổng kỹ năng này
          </span>
        </div>
      </div>
    </Card>
  );
}
