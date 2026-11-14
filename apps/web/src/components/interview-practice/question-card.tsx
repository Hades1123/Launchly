'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { PRACTICE_ANSWER_MAX_LENGTH, type PracticeSessionDto } from '@launchly/shared';
import { sourceKey } from '@/components/interview-practice/labels';
import { Badge } from '@/components/ui/badge';

type Question = PracticeSessionDto['rounds'][number]['questions'][number];

type QuestionCardProps = {
  question: Question;
  total: number;
  /** The draft shown in the answer box; the round panel owns drafts and saving. */
  value: string;
  onChange: (value: string) => void;
  /** Ctrl/Cmd + Enter: save and move on. */
  onSubmit: () => void;
  onBlur?: () => void;
};

/** The one question on screen: its prompt and the answer box. */
export function QuestionCard({
  question,
  total,
  value,
  onChange,
  onSubmit,
  onBlur,
}: QuestionCardProps) {
  const t = useTranslations('candidate.interviewPractice');
  const saved = question.answer?.answer ?? '';
  const dirty = value.trim() !== saved;
  const fieldId = 'practice-answer';

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="space-y-4 rounded-card bg-surface-muted p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-subtle-foreground">
          {t('question.of', { position: question.position, total })}
        </span>
        <Badge tone="neutral">{t(`sources.${sourceKey(question.source)}`)}</Badge>
      </div>
      <p className="font-display text-lg font-semibold text-foreground">{question.prompt}</p>
      <div className="space-y-2">
        <label htmlFor={fieldId} className="sr-only">
          {t('question.answerLabel', { position: question.position })}
        </label>
        <textarea
          id={fieldId}
          rows={8}
          maxLength={PRACTICE_ANSWER_MAX_LENGTH}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          placeholder={t('question.placeholder')}
          className="w-full resize-y rounded-control bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span role="status" className={dirty ? 'text-muted-foreground' : 'text-success'}>
            {dirty ? t('question.unsaved') : saved ? t('question.saved') : ''}
          </span>
          <span className="text-subtle-foreground">
            {value.length}/{PRACTICE_ANSWER_MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
