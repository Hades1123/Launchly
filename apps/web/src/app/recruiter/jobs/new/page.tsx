import Link from 'next/link';
import { JobPostingForm } from '@/components/recruiter/job-posting-form';

export default function NewJobPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <Link href="/recruiter/jobs" className="text-sm font-semibold text-primary hover:underline">
          ← Tin tuyển dụng của tôi
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
          Đăng tin tuyển dụng
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mô tả công việc, quy trình tuyển dụng và những lưu ý để ứng viên biết chính xác cách bạn
          tuyển người.
        </p>
      </header>
      <JobPostingForm />
    </main>
  );
}
