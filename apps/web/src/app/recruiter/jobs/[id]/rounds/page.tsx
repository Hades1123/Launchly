import { getTranslations } from 'next-intl/server';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { RoundsBuilder } from '@/components/recruiter/rounds-builder';

export default async function JobRoundsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('recruiter.pages.rounds');
  return (
    <div className="max-w-3xl">
      <RecruiterPageHeader
        back={{ href: `/recruiter/jobs/${id}`, label: t('back') }}
        title={t('title')}
        description={t('description')}
      />
      <RoundsBuilder jobId={id} />
    </div>
  );
}
