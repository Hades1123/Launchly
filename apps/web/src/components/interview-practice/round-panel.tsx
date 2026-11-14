'use client';

import { useState } from 'react';
import {
  PRACTICE_QUESTIONS_PER_ROUND,
  type PracticeRoundDto,
  type PracticeSessionDto,
} from '@launchly/shared';
import { QuestionCard } from '@/components/interview-practice/question-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { generateRoundFeedback, generateRoundQuestions } from '@/lib/api/interview-practice';

type RoundPanelProps = {
  sessionId: string;
  round: PracticeRoundDto;
  onChange: (session: PracticeSessionDto) => void;
};

/** The round being practiced: generate its five questions, answer them, then ask for feedback. */
export function RoundPanel({ sessionId, round, onChange }: RoundPanelProps) {
  const [step, setStep] = useState<'questions' | 'feedback' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasQuestions = round.questions.length === PRACTICE_QUESTIONS_PER_ROUND;
  const allAnswered = hasQuestions && round.questions.every((question) => question.answer);

  async function run(kind: 'questions' | 'feedback') {
    setStep(kind);
    setError(null);
    try {
      const generate = kind === 'questions' ? generateRoundQuestions : generateRoundFeedback;
      onChange(await generate(sessionId, round.id));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Something went wrong. Check your connection and try again.',
      );
    } finally {
      setStep(null);
    }
  }

  return (
    <Card className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">{round.name}</h3>

      {!hasQuestions && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Five written questions are prepared from the job and this round. It can take up to half
            a minute.
          </p>
          <Button onClick={() => run('questions')} disabled={step !== null}>
            {step === 'questions' ? 'Generating questions…' : 'Generate questions'}
          </Button>
        </div>
      )}

      {hasQuestions && (
        <>
          <ol aria-label="Questions" className="space-y-4">
            {round.questions.map((question) => (
              <QuestionCard
                key={question.id}
                sessionId={sessionId}
                question={question}
                onSaved={onChange}
              />
            ))}
          </ol>
          <div className="space-y-2">
            {!allAnswered && (
              <p className="text-sm text-muted-foreground">
                Save an answer to all five questions to get feedback.
              </p>
            )}
            <Button onClick={() => run('feedback')} disabled={!allAnswered || step !== null}>
              {step === 'feedback' ? 'Writing feedback…' : 'Get feedback'}
            </Button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error} You can try again.
        </p>
      )}
    </Card>
  );
}
