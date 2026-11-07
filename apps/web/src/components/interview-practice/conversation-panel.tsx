import { AudioLines, Bot, Lightbulb, Mic, Pause, Send, Volume2 } from 'lucide-react';
import { actionButtonClasses } from '@/components/interview-practice/action-button';
import type { InterviewSession } from '@/components/interview-practice/mock-interview-session';
import { RichText } from '@/components/interview-practice/rich-text';
import { Waveform } from '@/components/interview-practice/waveform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const iconProps = { strokeWidth: 1.75, 'aria-hidden': true } as const;
const micLevels = [2, 5, 3, 5, 4, 2];

function InterviewerMessage({ session }: { session: InterviewSession }) {
  const { interviewer, question } = session;
  return (
    <div className="flex items-start gap-4">
      <div className="relative shrink-0">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-foreground shadow-card">
          <Bot className="size-6" {...iconProps} />
        </span>
        <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
          <Bot className="size-2.5" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-display text-sm font-semibold">{interviewer.name}</span>
            <Badge tone="primary">{interviewer.badge}</Badge>
          </div>
          <span className="font-mono text-xs text-subtle-foreground">{question.sentAt}</span>
        </div>
        <div className="space-y-2 rounded-card rounded-tl-none bg-secondary/60 p-4 shadow-card">
          <p className="text-sm leading-relaxed">
            <RichText segments={question.text} />
          </p>
          <div className="flex items-center justify-between gap-2 rounded-control bg-surface p-2 shadow-card">
            <button
              type="button"
              aria-label="Nghe lại câu hỏi"
              className="flex items-center justify-center rounded-full bg-primary p-1 text-primary-foreground shadow-card transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Volume2 className="size-4" {...iconProps} />
            </button>
            <Waveform levels={question.waveform} tone="primary" className="h-5 flex-1" />
            <span className="font-mono text-xs text-subtle-foreground">{question.audioLength}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateMessage({ session }: { session: InterviewSession }) {
  const { candidate, answer } = session;
  return (
    <div className="flex flex-row-reverse items-start gap-4">
      <div className="relative shrink-0">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-subtle font-display text-sm font-bold text-success shadow-card">
          {candidate.initials}
        </span>
        <span className="absolute -bottom-1 -left-1 flex size-4 items-center justify-center rounded-full bg-success text-primary-foreground shadow-card">
          <Mic className="size-2.5" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-1">
          <span className="font-mono text-xs text-subtle-foreground">{answer.sentAt}</span>
          <span className="font-display text-sm font-semibold">{candidate.name} (Bạn)</span>
          <Badge tone="success" className="font-semibold">
            Đã ghi âm + bản ký âm
          </Badge>
        </div>
        <div className="max-w-xl space-y-2 rounded-card rounded-tr-none bg-primary p-4 text-left text-primary-foreground shadow-card-hover">
          <p className="text-sm leading-relaxed">
            <RichText segments={answer.text} variant="inverse" />
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-primary-hover p-2">
            <span className="flex items-center gap-1 text-xs font-medium">
              <AudioLines className="size-4" {...iconProps} />
              Bản ghi âm câu trả lời ({answer.recordingLength})
            </span>
            <span className="rounded bg-surface/20 px-1 py-0.5 text-xs font-semibold">
              Độ rõ: {answer.clarity}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordingControls() {
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface-strong p-4">
      <div className="flex items-center justify-between gap-2 rounded-control bg-surface px-4 py-2 shadow-card">
        <div className="flex items-center gap-2">
          <span aria-hidden className="relative flex size-3">
            <span className="absolute inline-flex size-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-3 rounded-full bg-success" />
          </span>
          <span className="font-display text-sm font-semibold">
            Microphone sẵn sàng thu giọng nói
          </span>
        </div>
        <Waveform levels={micLevels} tone="success" live />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={actionButtonClasses('neutral')}
            title="Gợi ý cấu trúc STAR"
          >
            <Lightbulb className="size-4 text-warning" {...iconProps} />
            Gợi ý mẹo trả lời
          </button>
          <button type="button" className={actionButtonClasses('neutral')}>
            <Pause className="size-4" {...iconProps} />
            Tạm dừng
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={actionButtonClasses('success', 'px-6')}>
            <Mic className="size-5" {...iconProps} />
            Thu âm tiếp
          </button>
          <Button variant="primary" className="px-6">
            Gửi câu trả lời
            <Send className="size-5" {...iconProps} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Left column: interviewer question, candidate answer transcript and recording deck. */
export function ConversationPanel({ session }: { session: InterviewSession }) {
  return (
    <Card className="flex flex-col justify-between gap-6 lg:min-h-144">
      <div className="flex flex-col gap-6">
        <InterviewerMessage session={session} />
        <CandidateMessage session={session} />
      </div>
      <RecordingControls />
    </Card>
  );
}
