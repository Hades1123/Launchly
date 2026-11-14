import { useTranslations } from 'next-intl';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { JobPostingForm } from '@/components/recruiter/job-posting-form';

export default function NewJobPage() {
  const t = useTranslations('recruiter.pages');
  return (
    <>
      <RecruiterPageHeader
        back={{ href: '/recruiter/jobs', label: t('jobsBack') }}
        title={t('new.title')}
        description={t('new.description')}
      />
      <JobPostingForm />
    </>
  );
}
