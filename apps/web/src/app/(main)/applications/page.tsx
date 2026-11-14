import { getTranslations } from 'next-intl/server';
import { ApplicationList } from '@/components/applications/application-list';

export async function generateMetadata() {
  const t = await getTranslations('candidate.applications.metadata');
  return { title: t('title') };
}

type ApplicationsPageProps = {
  searchParams: Promise<{ application?: string | string[] }>;
};

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { application } = await searchParams;
  const t = await getTranslations('candidate.applications');

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <ApplicationList openId={Array.isArray(application) ? application[0] : application} />
    </div>
  );
}
