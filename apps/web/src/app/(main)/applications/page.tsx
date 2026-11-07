import { ApplicationOverview } from '@/components/applications/application-overview';
import { ApplicationSpotlight } from '@/components/applications/application-spotlight';
import { FeedbackLog } from '@/components/applications/feedback-log';
import {
  applications,
  archivedFeedback,
  findApplication,
} from '@/components/applications/mock-applications';
import { OtherApplications } from '@/components/applications/other-applications';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Hồ sơ của tôi | Launchly' };

type ApplicationsPageProps = {
  searchParams: Promise<{ application?: string | string[] }>;
};

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { application } = await searchParams;
  const selected = findApplication(Array.isArray(application) ? application[0] : application);
  const others = applications.filter((item) => item.id !== selected.id);

  return (
    <div className="relative mx-auto w-full max-w-7xl overflow-x-clip px-4 py-6 md:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 left-1/4 -z-10 size-96 rounded-full bg-primary-subtle/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 right-10 -z-10 size-80 rounded-full bg-success-subtle/30 blur-3xl"
      />

      <div className="mb-4 flex justify-end">
        <Badge tone="warning" shape="pill">
          Dữ liệu minh họa, chưa kết nối API
        </Badge>
      </div>

      <ApplicationOverview activeCount={applications.length} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <ApplicationSpotlight application={selected} />
          <FeedbackLog feedback={archivedFeedback} />
        </div>
        <OtherApplications applications={others} />
      </div>
    </div>
  );
}
