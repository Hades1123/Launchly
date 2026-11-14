'use client';

import { useTranslations } from 'next-intl';
import type {
  PracticeRoundDto,
  PracticeRoundFeedbackDto,
  PracticeSummaryDto,
} from '@launchly/shared';
import { isGeneralRound, sourceKey } from '@/components/interview-practice/labels';
import { Badge } from '@/components/ui/badge';

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** The advisory text of a round feedback or the overall summary, with the shared disclaimer. */
function FeedbackBody({
  feedback,
  nextSteps,
}: {
  feedback: PracticeRoundFeedbackDto | PracticeSummaryDto;
  nextSteps?: string[];
}) {
  const t = useTranslations('candidate.interviewPractice.feedback');
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">{feedback.overview}</p>
      <Bullets title={t('strengths')} items={feedback.strengths} />
      <Bullets title={t('improvements')} items={feedback.improvements} />
      {nextSteps && <Bullets title={t('nextSteps')} items={nextSteps} />}
      <p className="rounded-control bg-info-subtle px-3 py-2 text-xs text-info">
        {t('disclaimer')}
      </p>
    </div>
  );
}

/** A completed round: its feedback, then each answer with its short note. */
export function RoundFeedbackView({ round }: { round: PracticeRoundDto }) {
  const t = useTranslations('candidate.interviewPractice');
  if (!round.feedback) return null;
  const name = isGeneralRound(round) ? t('session.generalRound') : round.name;
  return (
    <section aria-label={t('feedback.feedbackFor', { round: name })} className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">{name}</h3>
      <FeedbackBody feedback={round.feedback} />
      <ol aria-label={t('feedback.answersFor', { round: name })} className="space-y-3">
        {round.questions.map((question) => (
          <li key={question.id} className="space-y-1 rounded-card bg-surface-muted p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-foreground">
                {question.position}. {question.prompt}
              </p>
              <Badge tone="primary">{t(`sources.${sourceKey(question.source)}`)}</Badge>
            </div>
            <p className="whitespace-pre-line text-muted-foreground">{question.answer?.answer}</p>
            {question.answer?.feedback && (
              <p className="text-foreground">{question.answer.feedback}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The overall summary of a completed workflow. */
export function SummaryView({ summary }: { summary: PracticeSummaryDto }) {
  const t = useTranslations('candidate.interviewPractice.feedback');
  return (
    <section aria-label={t('summary')} className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">{t('summary')}</h3>
      <FeedbackBody feedback={summary} nextSteps={summary.nextSteps} />
    </section>
  );
}
