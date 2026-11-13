import { CvFitCheck } from '@/components/cv-review/cv-fit-check';

export const metadata = { title: 'CV fit check | Launchly' };

type CvReviewPageProps = { searchParams: Promise<{ jobId?: string | string[] }> };

export default async function CvReviewPage({ searchParams }: CvReviewPageProps) {
  const { jobId } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Check your CV fit
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a CV and a job, and get a score with concrete ways to improve.
        </p>
      </header>
      <CvFitCheck jobId={Array.isArray(jobId) ? jobId[0] : jobId} />
    </div>
  );
}
