import type {
  PracticeRoundDto,
  PracticeRoundFeedbackDto,
  PracticeSummaryDto,
} from '@launchly/shared';

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
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">{feedback.overview}</p>
      <Bullets title="Strengths" items={feedback.strengths} />
      <Bullets title="Things to improve" items={feedback.improvements} />
      {nextSteps && <Bullets title="Next steps" items={nextSteps} />}
      <p className="rounded-control bg-info-subtle px-3 py-2 text-xs text-info">
        {feedback.disclaimer}
      </p>
    </div>
  );
}

/** A completed round: its feedback, then each answer with its short note. */
export function RoundFeedbackView({ round }: { round: PracticeRoundDto }) {
  if (!round.feedback) return null;
  return (
    <section aria-label={`Feedback for ${round.name}`} className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">{round.name}</h3>
      <FeedbackBody feedback={round.feedback} />
      <ol aria-label={`Answers for ${round.name}`} className="space-y-3">
        {round.questions.map((question) => (
          <li key={question.id} className="space-y-1 rounded-card bg-surface-muted p-4 text-sm">
            <p className="font-medium text-foreground">
              {question.position}. {question.prompt}
            </p>
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
  return (
    <section aria-label="Overall summary" className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">Overall summary</h3>
      <FeedbackBody feedback={summary} nextSteps={summary.nextSteps} />
    </section>
  );
}
