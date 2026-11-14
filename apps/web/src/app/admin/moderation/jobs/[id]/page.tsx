import { getTranslations } from 'next-intl/server';
import { JobReview } from '@/components/admin/job-review';

export async function generateMetadata() {
  const t = await getTranslations('admin.metadata');
  return { title: t('jobReview') };
}

export default async function AdminJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobReview id={id} />;
}
