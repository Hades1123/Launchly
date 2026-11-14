import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ModerationTabs } from '@/components/admin/moderation-tabs';
import { PendingJobList } from '@/components/admin/pending-job-list';

export async function generateMetadata() {
  const t = await getTranslations('admin.metadata');
  return { title: t('jobModeration') };
}

export default function JobModerationPage() {
  const t = useTranslations('admin.moderation');
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">{t('heading')}</h1>
      <ModerationTabs active="jobs" />
      <PendingJobList />
    </>
  );
}
