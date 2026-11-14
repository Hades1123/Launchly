'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import {
  MAX_JOB_DESCRIPTION_LENGTH,
  type CreateAssessmentInput,
  type ResumeDto,
} from '@launchly/shared';
import { JobPicker, toJobChoice, type JobChoice } from '@/components/cv-review/job-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getJob } from '@/lib/api/jobs';
import { cn } from '@/lib/cn';

type Source = 'job' | 'text';
const SOURCES: Source[] = ['job', 'text'];

const fieldClasses =
  'w-full rounded-control border border-input bg-surface px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function StepLabel({
  step,
  htmlFor,
  children,
}: {
  step: number;
  htmlFor?: string;
  children: string;
}) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-sm font-semibold text-foreground"
    >
      <span
        aria-hidden
        className="flex size-6 items-center justify-center rounded-full bg-primary-subtle text-xs text-primary-subtle-foreground"
      >
        {step}
      </span>
      {children}
    </Tag>
  );
}

/** Two-option segmented control with radio semantics (arrow keys move the choice). */
function SourceSwitch({ value, onChange }: { value: Source; onChange: (source: Source) => void }) {
  const t = useTranslations('candidate.cvReview.form');
  const refs = useRef<Record<Source, HTMLButtonElement | null>>({ job: null, text: null });

  function onKeyDown(event: React.KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const next = value === 'job' ? 'text' : 'job';
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('compareAgainst')}
      className="grid grid-cols-2 gap-1 rounded-control bg-surface-muted p-1"
      onKeyDown={onKeyDown}
    >
      {SOURCES.map((source) => (
        <button
          key={source}
          ref={(node) => {
            refs.current[source] = node;
          }}
          type="button"
          role="radio"
          aria-checked={value === source}
          tabIndex={value === source ? 0 : -1}
          onClick={() => onChange(source)}
          className={cn(
            'rounded-control px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === source
              ? 'bg-surface text-foreground shadow-card'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {source === 'job' ? t('sourceJob') : t('sourceText')}
        </button>
      ))}
    </div>
  );
}

type FitCheckFormProps = {
  resumes: ResumeDto[];
  initialJobId?: string;
  pending: boolean;
  onSubmit: (input: CreateAssessmentInput) => void;
};

export function FitCheckForm({ resumes, initialJobId, pending, onSubmit }: FitCheckFormProps) {
  const t = useTranslations('candidate.cvReview.form');
  const format = useFormatter();
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? '');
  const [source, setSource] = useState<Source>('job');
  const [job, setJob] = useState<JobChoice | null>(null);
  const [text, setText] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  // `?jobId=` preselects the job; an unknown id just leaves the picker empty.
  useEffect(() => {
    if (!initialJobId) return;
    let active = true;
    async function load(id: string) {
      try {
        const detail = await getJob(id);
        if (active) setJob(toJobChoice(detail));
      } catch {
        // Leave the picker empty.
      }
    }
    void load(initialJobId);
    return () => {
      active = false;
    };
  }, [initialJobId]);

  const resume = resumes.find((item) => item.id === resumeId);
  const ready = Boolean(resumeId) && (source === 'job' ? Boolean(job) : text.trim().length > 0);

  function pasteInstead() {
    setSource('text');
    requestAnimationFrame(() => textRef.current?.focus());
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onSubmit(
      source === 'job' ? { resumeId, jobId: job!.id } : { resumeId, jobDescription: text.trim() },
    );
  }

  return (
    <Card>
      <form className="space-y-6" onSubmit={submit}>
        <div className="space-y-2">
          <StepLabel step={1} htmlFor="fit-cv">
            {t('cv')}
          </StepLabel>
          <select
            id="fit-cv"
            className={fieldClasses}
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
          >
            {resumes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fileName}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {resume && (
              <span className="text-subtle-foreground">
                {t('uploadedOn', {
                  date: format.dateTime(new Date(resume.createdAt), { dateStyle: 'medium' }),
                })}
              </span>
            )}
            <Link href="/profile" className="font-semibold text-primary hover:underline">
              {t('uploadCv')}
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <StepLabel step={2}>{t('compareAgainst')}</StepLabel>
          <SourceSwitch value={source} onChange={setSource} />
          {source === 'job' ? (
            <JobPicker value={job} onChange={setJob} onPasteInstead={pasteInstead} />
          ) : (
            <div className="space-y-1">
              <label htmlFor="fit-jd" className="sr-only">
                {t('jobDescription')}
              </label>
              <textarea
                ref={textRef}
                id="fit-jd"
                rows={10}
                maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                placeholder={t('jobDescriptionPlaceholder')}
                className={fieldClasses}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <p className="text-right text-xs text-subtle-foreground">
                {text.length} / {MAX_JOB_DESCRIPTION_LENGTH}
              </p>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={!ready || pending}>
          {pending ? t('analysing') : t('analyse')}
        </Button>
      </form>
    </Card>
  );
}
