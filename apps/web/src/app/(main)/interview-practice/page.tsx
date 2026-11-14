import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CandidateGate } from '@/components/interview-practice/candidate-gate';
import { JobPicker } from '@/components/interview-practice/job-picker';
import { PracticeHistory } from '@/components/interview-practice/practice-history';
import { PracticeStart } from '@/components/interview-practice/practice-start';
import { cn } from '@/lib/cn';

export async function generateMetadata() {
  const t = await getTranslations('candidate.interviewPractice');
  return { title: t('metadata.title') };
}

type PageProps = {
  searchParams: Promise<{
    jobId?: string | string[];
    tab?: string | string[];
    keyword?: string | string[];
    page?: string | string[];
  }>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function InterviewPracticePage({ searchParams }: PageProps) {
  const t = await getTranslations('candidate.interviewPractice');
  const params = await searchParams;
  const jobId = first(params.jobId);
  const history = first(params.tab) === 'history';
  const keyword = first(params.keyword)?.trim() ?? '';
  const page = Math.max(1, Math.floor(Number(first(params.page)) || 1));

  const tabs = [
    { label: t('tabs.new'), href: '/interview-practice', current: !history },
    { label: t('tabs.history'), href: '/interview-practice?tab=history', current: history },
  ];

  return (
    <div className="mx-auto w-full max-w-page space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <nav aria-label={t('tabs.label')} className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.current ? 'page' : undefined}
            className={cn(
              'rounded-control px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              tab.current
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:text-primary',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <CandidateGate next={history ? '/interview-practice?tab=history' : '/interview-practice'}>
        {history ? (
          <div className="max-w-4xl">
            <PracticeHistory />
          </div>
        ) : jobId ? (
          <div className="max-w-4xl">
            <PracticeStart key={jobId} jobId={jobId} />
          </div>
        ) : (
          <JobPicker keyword={keyword} page={page} />
        )}
      </CandidateGate>
    </div>
  );
}
