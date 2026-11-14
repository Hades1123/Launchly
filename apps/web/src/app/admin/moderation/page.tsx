import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ModerationTabs } from '@/components/admin/moderation-tabs';
import { PendingCompanyList } from '@/components/admin/pending-company-list';

export async function generateMetadata() {
  const t = await getTranslations('admin.metadata');
  return { title: t('moderation') };
}

export default function ModerationPage() {
  const t = useTranslations('admin.moderation');
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">{t('heading')}</h1>
      <ModerationTabs active="companies" />
      <PendingCompanyList />
    </>
  );
}
