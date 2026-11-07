import { ActionPlan, ApplyBar } from '@/components/cv-review/action-plan';
import { CvReviewHeader } from '@/components/cv-review/cv-review-header';
import { cvReview } from '@/components/cv-review/mock-cv-review';
import { ScoreOverview } from '@/components/cv-review/score-overview';
import { SkillBreakdown } from '@/components/cv-review/skill-breakdown';
import { findJob } from '@/components/jobs/mock-jobs';

export const metadata = { title: 'AI đánh giá CV | Launchly' };

export default function CvReviewPage() {
  const job = findJob(cvReview.jobId);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 md:px-8">
      <CvReviewHeader review={cvReview} job={job} />
      <ScoreOverview review={cvReview} job={job} />
      <SkillBreakdown review={cvReview} job={job} />
      <ActionPlan review={cvReview} />
      <ApplyBar review={cvReview} />
    </div>
  );
}
