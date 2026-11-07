import { ConversationPanel } from '@/components/interview-practice/conversation-panel';
import { FeedbackPanel } from '@/components/interview-practice/feedback-panel';
import { interviewSession } from '@/components/interview-practice/mock-interview-session';
import { SessionBar } from '@/components/interview-practice/session-bar';
import { SessionFooter } from '@/components/interview-practice/session-footer';

export const metadata = { title: 'Luyện phỏng vấn AI | Launchly' };

export default function InterviewPracticePage() {
  const session = interviewSession;

  return (
    <div className="flex w-full flex-col">
      <SessionBar session={session} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section aria-label="Hội thoại phỏng vấn" className="lg:col-span-7">
            <ConversationPanel session={session} />
          </section>
          <section aria-label="Đánh giá câu trả lời" className="lg:col-span-5">
            <FeedbackPanel session={session} />
          </section>
        </div>
      </div>

      <SessionFooter session={session} />
    </div>
  );
}
