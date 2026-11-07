import Link from 'next/link';
import { FileText, FolderOpen, RefreshCw, Zap } from 'lucide-react';
import { PrivacyToggle } from '@/components/cv-review/privacy-toggle';
import type { CvReview } from '@/components/cv-review/mock-cv-review';
import type { Job } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;

export function CvReviewHeader({ review, job }: { review: CvReview; job: Job }) {
  return (
    <header className="flex flex-col justify-between gap-4 py-6 xl:flex-row xl:items-center">
      <div className="space-y-1">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-0.5">
            <FolderOpen className="size-4" {...iconProps} />
            CV Diagnostics
          </span>
          <span aria-hidden className="text-subtle-foreground">
            /
          </span>
          <Link
            href={`/jobs?job=${job.id}`}
            className="rounded bg-surface-strong px-1 py-0.5 font-display font-semibold text-foreground transition-colors hover:text-primary"
          >
            {job.shortTitle} @ {job.company}
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            AI CV Match & Gap Analysis
          </h1>
          <Badge tone="primary" shape="pill" className="font-semibold">
            <Zap className="size-3.5" {...iconProps} />
            Phân tích trong {review.analysisSeconds}s
          </Badge>
          <Badge tone="warning" shape="pill">
            Dữ liệu minh họa, chưa kết nối API
          </Badge>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 rounded-card bg-surface-muted p-2 shadow-card sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2 px-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-strong text-primary">
            <FileText className="size-6" {...iconProps} />
          </span>
          <div className="min-w-0">
            <p
              title={review.cvFile.name}
              className="max-w-52 truncate font-display text-sm font-semibold"
            >
              {review.cvFile.name}
            </p>
            <p className="font-mono text-xs text-subtle-foreground">{review.cvFile.meta}</p>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-1 pl-1 sm:w-auto sm:justify-end">
          <Button variant="icon" className="px-4">
            <RefreshCw className="size-4" {...iconProps} />
            Đổi CV
          </Button>
          <PrivacyToggle />
        </div>
      </div>
    </header>
  );
}
