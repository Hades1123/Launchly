import { CandidateGate } from '@/components/interview-practice/candidate-gate';
import { PracticeSession } from '@/components/interview-practice/practice-session';

export const metadata = { title: 'Interview practice | Launchly' };

type PageProps = { params: Promise<{ id: string }> };

export default async function PracticeSessionPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Interview practice
      </h1>
      <CandidateGate next={`/interview-practice/${id}`}>
        <PracticeSession key={id} id={id} />
      </CandidateGate>
    </div>
  );
}
