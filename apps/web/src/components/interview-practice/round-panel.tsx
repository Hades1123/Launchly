'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import {
  PRACTICE_QUESTIONS_PER_ROUND,
  type PracticeRoundDto,
  type PracticeSessionDto,
} from '@launchly/shared';
import { QuestionCard } from '@/components/interview-practice/question-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import {
  generateRoundFeedback,
  generateRoundQuestions,
  savePracticeAnswer,
} from '@/lib/api/interview-practice';
import { cn } from '@/lib/cn';

type RoundPanelProps = {
  sessionId: string;
  round: PracticeRoundDto;
  /** The round's display name (a quick practice's round is translated). */
  roundName: string;
  onChange: (session: PracticeSessionDto) => void;
};

type Question = PracticeRoundDto['questions'][number];
type Step = 'save' | 'questions' | 'feedback' | null;

const savedOf = (question: Question) => question.answer?.answer ?? '';

/** The round being practiced: generate its five questions, answer them one at a time, then ask for feedback. */
export function RoundPanel({ sessionId, round, roundName, onChange }: RoundPanelProps) {
  const t = useTranslations('candidate.interviewPractice.round');
  const [step, setStep] = useState<Step>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // True while a button action runs; its response is fresher than a background save's.
  const busy = useRef(false);
  // Resume at the first question still without a saved answer.
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      round.questions.findIndex((question) => !question.answer),
    ),
  );

  const questions = round.questions;
  const hasQuestions = questions.length === PRACTICE_QUESTIONS_PER_ROUND;
  const current = hasQuestions ? questions[index] : undefined;

  const valueOf = (question: Question) => drafts[question.id] ?? savedOf(question);
  const filled = (question: Question) => valueOf(question).trim() !== '';
  const isDirty = (question: Question) => valueOf(question).trim() !== savedOf(question);

  const answered = questions.filter((question) => question.answer).length;
  const last = index === questions.length - 1;
  const canSave = current !== undefined && isDirty(current) && filled(current);
  // The answer on screen counts once it is written; it is saved before feedback is requested.
  const ready =
    hasQuestions &&
    questions.every((question) =>
      question.id === current?.id ? filled(question) : Boolean(question.answer),
    );
  const unsaved = questions.some((question) => isDirty(question) && filled(question));

  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const failure = (cause: unknown) => (cause instanceof ApiError ? cause.message : t('error'));

  async function attempt(kind: Exclude<Step, null>, action: () => Promise<void>) {
    busy.current = true;
    setStep(kind);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(failure(cause));
    } finally {
      busy.current = false;
      setStep(null);
    }
  }

  async function saveCurrent() {
    if (!current || !canSave) return;
    onChange(await savePracticeAnswer(sessionId, current.id, { answer: valueOf(current) }));
  }

  async function generate() {
    onChange(await generateRoundQuestions(sessionId, round.id));
  }

  async function feedback() {
    await saveCurrent();
    onChange(await generateRoundFeedback(sessionId, round.id));
  }

  /** Move to another question, saving the answer on screen first when it changed. */
  function go(to: number) {
    if (to < 0 || to >= questions.length || to === index) return;
    if (!canSave) {
      setError(null);
      setIndex(to);
      return;
    }
    void attempt('save', async () => {
      await saveCurrent();
      setIndex(to);
    });
  }

  /**
   * The last question has no "next", so its answer is saved in the background when the box
   * loses focus. Buttons are left enabled: "Get feedback" and the navigation save it again
   * themselves, and an answer is simply overwritten.
   */
  function saveInBackground() {
    if (!current || !canSave || step !== null) return;
    setError(null);
    savePracticeAnswer(sessionId, current.id, { answer: valueOf(current) }).then(
      (session) => {
        if (!busy.current) onChange(session);
      },
      (cause: unknown) => setError(failure(cause)),
    );
  }

  function submit() {
    if (step !== null) return;
    if (last) saveInBackground();
    else go(index + 1);
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-foreground">{roundName}</h3>
        {hasQuestions && (
          <span className="text-sm text-muted-foreground">
            {t('answered', { answered, total: questions.length })}
          </span>
        )}
      </div>

      {!hasQuestions && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('intro')}</p>
          <Button onClick={() => void attempt('questions', generate)} disabled={step !== null}>
            {step === 'questions' ? t('generating') : t('generate')}
          </Button>
        </div>
      )}

      {current && (
        <>
          <ol aria-label={t('questionsLabel')} className="grid grid-cols-5 gap-2">
            {questions.map((question, position) => {
              const here = position === index;
              const done = Boolean(question.answer);
              return (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => go(position)}
                    disabled={step !== null}
                    aria-current={here ? 'step' : undefined}
                    aria-label={t(done ? 'navAnswered' : 'navOpen', {
                      position: question.position,
                    })}
                    className={cn(
                      'flex h-10 w-full items-center justify-center gap-1 rounded-control text-sm font-semibold transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed',
                      here
                        ? 'bg-primary text-primary-foreground shadow-card-hover'
                        : done
                          ? 'bg-success-subtle text-success hover:bg-secondary'
                          : 'bg-surface-muted text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    {done && !here && <Check aria-hidden className="size-4" />}
                    {question.position}
                  </button>
                </li>
              );
            })}
          </ol>

          <QuestionCard
            question={current}
            total={questions.length}
            value={valueOf(current)}
            onChange={(value) => setDrafts((all) => ({ ...all, [current.id]: value }))}
            onSubmit={submit}
            onBlur={last ? saveInBackground : undefined}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => go(index - 1)}
              disabled={index === 0 || step !== null}
            >
              <ChevronLeft aria-hidden className="size-4" />
              {t('previous')}
            </Button>
            <span className="hidden text-xs text-subtle-foreground sm:inline">
              {last ? t('hintSave') : t('hintContinue')}
            </span>
            {last ? (
              // Keeps Previous on the left; the last answer saves on blur or with feedback.
              <span aria-hidden />
            ) : (
              <Button variant="soft" onClick={submit} disabled={step !== null}>
                {step === 'save' ? t('saving') : canSave ? t('saveAndNext') : t('next')}
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{ready ? t('ready') : t('notReady')}</p>
            <Button
              onClick={() => void attempt('feedback', feedback)}
              disabled={!ready || step !== null}
            >
              {step === 'feedback' ? t('writingFeedback') : t('getFeedback')}
            </Button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error} {t('retry')}
        </p>
      )}
    </Card>
  );
}
