import { JobReview } from '@/components/admin/job-review';

export const metadata = { title: 'Duyệt tin tuyển dụng · Launchly' };

export default async function AdminJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobReview id={id} />;
}
