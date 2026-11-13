import Link from 'next/link';
import { JobPostingForm } from '@/components/recruiter/job-posting-form';

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <Link href="/recruiter/jobs" className="text-sm font-semibold text-primary hover:underline">
          ← Tin tuyển dụng của tôi
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
          Chỉnh sửa bản nháp
        </h1>
      </header>
      <JobPostingForm key={id} jobId={id} justSaved={saved === '1'} />
    </main>
  );
}
