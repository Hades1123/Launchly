import { getTranslations } from 'next-intl/server';
import { CvFitCheck } from '@/components/cv-review/cv-fit-check';

export async function generateMetadata() {
  const t = await getTranslations('candidate.cvReview.metadata');
  return { title: t('title') };
}

type CvReviewPageProps = { searchParams: Promise<{ jobId?: string | string[] }> };

export default async function CvReviewPage({ searchParams }: CvReviewPageProps) {
  const { jobId } = await searchParams;
  const t = await getTranslations('candidate.cvReview');

  return (
    <div className="mx-auto w-full max-w-page space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <CvFitCheck jobId={Array.isArray(jobId) ? jobId[0] : jobId} />
    </div>
  );
}
