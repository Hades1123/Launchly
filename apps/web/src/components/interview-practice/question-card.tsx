'use client';

import { useState } from 'react';
import type { PracticeSessionDto } from '@launchly/shared';
import { PRACTICE_ANSWER_MAX_LENGTH } from '@launchly/shared';
import { sourceLabel } from '@/components/interview-practice/source-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/http';
import { savePracticeAnswer } from '@/lib/api/interview-practice';

type Question = PracticeSessionDto['rounds'][number]['questions'][number];

type QuestionCardProps = {
  sessionId: string;
  question: Question;
  /** Called with the session the server returns after the answer is saved. */
  onSaved: (session: PracticeSessionDto) => void;
};

/** One generated question with its text answer; the answer is saved through the API. */
export function QuestionCard({ sessionId, question, onSaved }: QuestionCardProps) {
  const saved = question.answer?.answer ?? '';
  const [value, setValue] = useState(saved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value.trim() !== saved;
  const fieldId = `answer-${question.id}`;

  async function save() {
    setPending(true);
    setError(null);
    try {
      onSaved(await savePracticeAnswer(sessionId, question.id, { answer: value }));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not save your answer. Try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="space-y-3 rounded-card bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-subtle-foreground">
          Question {question.position}
        </span>
        <Badge tone="primary">{sourceLabel(question.source)}</Badge>
      </div>
      <p className="text-sm font-medium text-foreground">{question.prompt}</p>
      <div className="space-y-2">
        <label htmlFor={fieldId} className="sr-only">
          Answer to question {question.position}
        </label>
        <textarea
          id={fieldId}
          rows={4}
          maxLength={PRACTICE_ANSWER_MAX_LENGTH}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write your answer"
          className="w-full rounded-control bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="soft"
            aria-label={`Save answer ${question.position}`}
            onClick={save}
            disabled={pending || value.trim() === '' || !dirty}
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
          {!dirty && saved !== '' && (
            <span role="status" className="text-sm text-success">
              Saved
            </span>
          )}
          {dirty && saved !== '' && (
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
