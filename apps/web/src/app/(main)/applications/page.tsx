import { ApplicationList } from '@/components/applications/application-list';

export const metadata = { title: 'My applications | Launchly' };

type ApplicationsPageProps = {
  searchParams: Promise<{ application?: string | string[] }>;
};

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { application } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          My applications
        </h1>
        <p className="text-sm text-muted-foreground">
          Follow every application from Submitted to the final result.
        </p>
      </header>
      <ApplicationList openId={Array.isArray(application) ? application[0] : application} />
    </div>
  );
}
