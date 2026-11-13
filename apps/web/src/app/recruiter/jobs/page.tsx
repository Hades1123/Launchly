import { RecruiterJobList } from '@/components/recruiter/recruiter-job-list';

export default async function RecruiterJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string | string[] }>;
}) {
  const { submitted } = await searchParams;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Tin tuyển dụng của tôi
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bản nháp chỉ bạn nhìn thấy. Tin gửi duyệt sẽ hiển thị cho ứng viên sau khi quản trị viên
          duyệt.
        </p>
      </header>
      <RecruiterJobList submittedId={typeof submitted === 'string' ? submitted : undefined} />
    </main>
  );
}
