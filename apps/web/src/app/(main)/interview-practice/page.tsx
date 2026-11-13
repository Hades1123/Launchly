import Link from 'next/link';
import { CandidateGate } from '@/components/interview-practice/candidate-gate';
import { JobPicker } from '@/components/interview-practice/job-picker';
import { PracticeHistory } from '@/components/interview-practice/practice-history';
import { PracticeStart } from '@/components/interview-practice/practice-start';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Interview practice | Launchly' };

type PageProps = {
  searchParams: Promise<{ jobId?: string | string[]; tab?: string | string[] }>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function InterviewPracticePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const jobId = first(params.jobId);
  const history = first(params.tab) === 'history';

  const tabs = [
    { label: 'New practice', href: '/interview-practice', current: !history },
    { label: 'History', href: '/interview-practice?tab=history', current: history },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Interview practice
        </h1>
        <p className="text-sm text-muted-foreground">
          Answer five written questions per interview round and get advisory AI feedback. Nothing
          here affects a hiring decision.
        </p>
      </header>

      <nav aria-label="Practice sections" className="flex gap-2">
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
          <PracticeHistory />
        ) : jobId ? (
          <PracticeStart key={jobId} jobId={jobId} />
        ) : (
          <JobPicker />
        )}
      </CandidateGate>
    </div>
  );
}
