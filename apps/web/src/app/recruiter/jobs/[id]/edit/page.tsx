import { getTranslations } from 'next-intl/server';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { JobPostingForm } from '@/components/recruiter/job-posting-form';

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const t = await getTranslations('recruiter.pages');
  return (
    <>
      <RecruiterPageHeader
        back={{ href: '/recruiter/jobs', label: t('jobsBack') }}
        title={t('edit.title')}
      />
      <JobPostingForm key={id} jobId={id} justSaved={saved === '1'} />
    </>
  );
}
