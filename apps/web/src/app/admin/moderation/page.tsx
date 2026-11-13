import { ModerationTabs } from '@/components/admin/moderation-tabs';
import { PendingCompanyList } from '@/components/admin/pending-company-list';

export const metadata = { title: 'Duyệt nội dung · Launchly' };

export default function ModerationPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">Duyệt nội dung</h1>
      <ModerationTabs active="companies" />
      <PendingCompanyList />
    </>
  );
}
