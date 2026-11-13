import { ModerationTabs } from '@/components/admin/moderation-tabs';
import { PendingJobList } from '@/components/admin/pending-job-list';

export const metadata = { title: 'Duyệt tin tuyển dụng · Launchly' };

export default function JobModerationPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">Duyệt nội dung</h1>
      <ModerationTabs active="jobs" />
      <PendingJobList />
    </>
  );
}
