'use client';

import { useEffect, useState } from 'react';
import {
  MAX_JOB_DESCRIPTION_LENGTH,
  type CreateAssessmentInput,
  type ResumeDto,
} from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getJob, searchJobs } from '@/lib/api/jobs';

type JobChoice = { id: string; title: string; company: string };
type Source = 'job' | 'text';

const fieldClasses =
  'w-full rounded-control border border-input bg-surface px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/** Searchable select over public Launchly jobs. */
function JobPicker({
  value,
  onChange,
}: {
  value: JobChoice | null;
  onChange: (job: JobChoice | null) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<JobChoice[]>([]);

  useEffect(() => {
    if (keyword.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchJobs({ keyword: keyword.trim(), limit: 8 }, { signal: controller.signal })
        .then((page) =>
          setResults(page.data.map((j) => ({ id: j.id, title: j.title, company: j.company.name }))),
        )
        .catch(() => setResults([]));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-control bg-surface-muted px-3 py-2 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-semibold text-foreground">{value.title}</span>
          <span className="text-muted-foreground"> · {value.company}</span>
        </span>
        <Button variant="ghost" onClick={() => onChange(null)}>
          Change job
        </Button>
      </div>
    );
  }

  const visible = keyword.trim().length >= 2 ? results : [];
  return (
    <div className="space-y-2">
      <input
        aria-label="Search jobs"
        placeholder="Search a Launchly job by title…"
        className={fieldClasses}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      {visible.length > 0 && (
        <ul
          aria-label="Job results"
          className="divide-y divide-border rounded-control border border-border"
        >
          {visible.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => onChange(job)}
              >
                <span className="font-semibold text-foreground">{job.title}</span>
                <span className="text-muted-foreground"> · {job.company}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? '');
  const [source, setSource] = useState<Source>('job');
  const [job, setJob] = useState<JobChoice | null>(null);
  const [text, setText] = useState('');

  // `?jobId=` preselects the job; an unknown id just leaves the picker empty.
  useEffect(() => {
    if (!initialJobId) return;
    let active = true;
    getJob(initialJobId)
      .then((detail) => {
        if (active) setJob({ id: detail.id, title: detail.title, company: detail.company.name });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialJobId]);

  const ready = Boolean(resumeId) && (source === 'job' ? Boolean(job) : text.trim().length > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onSubmit(
      source === 'job' ? { resumeId, jobId: job!.id } : { resumeId, jobDescription: text.trim() },
    );
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={submit}>
        <div className="space-y-1.5">
          <label htmlFor="fit-cv" className="text-sm font-semibold text-foreground">
            Your CV
          </label>
          <select
            id="fit-cv"
            className={fieldClasses}
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.fileName}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Compare against</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="source"
                checked={source === 'job'}
                onChange={() => setSource('job')}
              />
              A Launchly job
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="source"
                checked={source === 'text'}
                onChange={() => setSource('text')}
              />
              A pasted job description
            </label>
          </div>
          {source === 'job' ? (
            <JobPicker value={job} onChange={setJob} />
          ) : (
            <div className="space-y-1">
              <label htmlFor="fit-jd" className="sr-only">
                Job description
              </label>
              <textarea
                id="fit-jd"
                rows={8}
                maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                placeholder="Paste the job description here…"
                className={fieldClasses}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <p className="text-right text-xs text-subtle-foreground">
                {text.length} / {MAX_JOB_DESCRIPTION_LENGTH}
              </p>
            </div>
          )}
        </fieldset>

        <Button type="submit" disabled={!ready || pending}>
          {pending ? 'Analysing…' : 'Analyse'}
        </Button>
      </form>
    </Card>
  );
}
