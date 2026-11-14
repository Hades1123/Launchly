'use client';

import { Building2, FileText, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import type { JobLevel, PublicJobDetail, PublicJobItem } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listMyApplications } from '@/lib/api/applications';
import { getJob, searchJobs } from '@/lib/api/jobs';
import { cn } from '@/lib/cn';
import { foldText, getInitials, levelConfig } from '@/lib/job-format';

/** A job the candidate can compare their CV against; the extra fields are shown when known. */
export type JobChoice = {
  id: string;
  title: string;
  company: string;
  location?: string;
  level?: JobLevel;
  createdAt?: string;
};

type CompanyChoice = { id: string; name: string };
type Option =
  { kind: 'job'; job: JobChoice } | { kind: 'company'; company: CompanyChoice } | { kind: 'paste' };
type Group = { key: string; label: string; options: Option[] };
type Suggestions = { recent: JobChoice[]; applied: JobChoice[]; latest: JobChoice[] };
type Found = { query: string; jobs: PublicJobItem[]; failed: boolean };

const MIN_KEYWORD = 2;
const SUGGESTIONS_PER_GROUP = 5;
const RECENT_KEY = 'launchly.cvReview.recentJobs';

export function toJobChoice(job: PublicJobItem | PublicJobDetail): JobChoice {
  return {
    id: job.id,
    title: job.title,
    company: job.company.name,
    location: job.location,
    level: job.level,
    createdAt: job.createdAt,
  };
}

function isJobChoice(value: unknown): value is JobChoice {
  const job = value as JobChoice | null;
  return (
    typeof job?.id === 'string' && typeof job.title === 'string' && typeof job.company === 'string'
  );
}

/** Jobs picked earlier on this device; storage may be unavailable, so failures read as empty. */
function readRecent(): JobChoice[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isJobChoice).slice(0, SUGGESTIONS_PER_GROUP) : [];
  } catch {
    return [];
  }
}

function rememberJob(job: JobChoice) {
  try {
    const next = [job, ...readRecent().filter((item) => item.id !== job.id)];
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, SUGGESTIONS_PER_GROUP)));
  } catch {
    // Remembering is a convenience only.
  }
}

/** Bolds the first case-insensitive occurrence of the keyword. */
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const needle = keyword.trim().toLowerCase();
  const start = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (start < 0) return <>{text}</>;
  const end = start + needle.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-transparent font-bold text-primary">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function CompanyAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-control bg-primary-subtle font-semibold text-primary-subtle-foreground',
        size === 'md' ? 'size-11 text-sm' : 'size-9 text-xs',
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/** "HCM · 3 days ago", from whatever the job choice knows. */
function useJobMeta() {
  const format = useFormatter();
  const now = useNow();
  return (job: JobChoice) =>
    [job.location, job.createdAt && format.relativeTime(new Date(job.createdAt), now)]
      .filter(Boolean)
      .join(' · ');
}

function OptionRow({
  id,
  active,
  onPick,
  onHover,
  children,
}: {
  id: string;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      // Keep focus in the input so the list does not close before the click lands.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      onMouseMove={onHover}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-control px-2 py-2',
        active && 'bg-secondary',
      )}
    >
      {children}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden className="space-y-1 p-1">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-1 py-2">
          <span className="size-9 animate-pulse rounded-control bg-surface-muted" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <span className="block h-2.5 w-1/3 animate-pulse rounded bg-surface-muted" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Lazily loaded description and requirements of the selected job. */
function JobPreview({ jobId }: { jobId: string }) {
  const t = useTranslations('candidate.cvReview.form');
  const [detail, setDetail] = useState<PublicJobDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loaded = await getJob(jobId);
        if (active) setDetail(loaded);
      } catch {
        if (active) setFailed(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  if (failed) return <p className="text-sm text-danger">{t('jdLoadError')}</p>;
  if (!detail) {
    return (
      <div aria-hidden className="space-y-2">
        <span className="block h-3 w-full animate-pulse rounded bg-surface-muted" />
        <span className="block h-3 w-5/6 animate-pulse rounded bg-surface-muted" />
        <span className="block h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
        <p className="whitespace-pre-line text-muted-foreground">{detail.description}</p>
        {detail.requirements.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">{t('requirements')}</p>
            <ul className="list-disc space-y-1 pl-5 text-foreground marker:text-primary">
              {detail.requirements.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Link
        href={`/jobs/${detail.id}`}
        target="_blank"
        rel="noopener"
        className="inline-block font-semibold text-primary hover:underline"
      >
        {t('openJob')}
      </Link>
    </div>
  );
}

function SelectedJob({ job, onChange }: { job: JobChoice; onChange: () => void }) {
  const t = useTranslations('candidate.cvReview.form');
  const tJobs = useTranslations('jobs');
  const meta = useJobMeta()(job);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-3 rounded-control border border-border p-3">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={job.company} size="md" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-foreground">{job.title}</p>
          <p className="text-sm text-muted-foreground">{job.company}</p>
          {(job.level || meta) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-subtle-foreground">
              {job.level && (
                <Badge tone={levelConfig[job.level].tone} shape="pill">
                  {tJobs(`levels.${job.level}`)}
                </Badge>
              )}
              {meta && <span>{meta}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="soft"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? t('hideJd') : t('viewJd')}
        </Button>
        <Button variant="ghost" onClick={onChange}>
          {t('changeJob')}
        </Button>
      </div>
      {showDetails && <JobPreview jobId={job.id} />}
    </div>
  );
}

type JobPickerProps = {
  value: JobChoice | null;
  onChange: (job: JobChoice | null) => void;
  /** Switches the form to the pasted job description. */
  onPasteInstead: () => void;
};

/**
 * Combobox over public Launchly jobs. Empty, it suggests recent, applied and new jobs; typing searches
 * titles and company names, and picking a company narrows the list to that company's jobs.
 */
export function JobPicker({ value, onChange, onPasteInstead }: JobPickerProps) {
  const t = useTranslations('candidate.cvReview.form');
  const jobMeta = useJobMeta();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wasSelected = useRef(false);
  const suggestionsRequested = useRef(false);

  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [company, setCompany] = useState<CompanyChoice | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [found, setFound] = useState<Found | null>(null);

  const trimmed = keyword.trim();
  // A picked company is searched by name; its jobs are then narrowed by the typed keyword locally.
  const query = company ? company.name : trimmed.length >= MIN_KEYWORD ? trimmed : '';
  const searchState = !query
    ? 'idle'
    : found?.query !== query
      ? 'loading'
      : found.failed
        ? 'error'
        : 'done';

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          const page = await searchJobs(
            { keyword: query, limit: 20 },
            { signal: controller.signal },
          );
          setFound({ query, jobs: page.data, failed: false });
        } catch {
          if (!controller.signal.aborted) setFound({ query, jobs: [], failed: true });
        }
      },
      company ? 0 : 250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, company]);

  // "Change job" brings the search back with the previous keyword and focuses it.
  useEffect(() => {
    if (!value && wasSelected.current) inputRef.current?.focus();
    wasSelected.current = Boolean(value);
  }, [value]);

  const groups = useMemo<Group[]>(() => {
    if (!query) {
      if (!suggestions) return [];
      const seen = new Set<string>();
      const take = (jobs: JobChoice[]): Option[] =>
        jobs
          .filter((job) => !seen.has(job.id) && Boolean(seen.add(job.id)))
          .slice(0, SUGGESTIONS_PER_GROUP)
          .map((job) => ({ kind: 'job', job }));
      return [
        { key: 'recent', label: t('picker.recent'), options: take(suggestions.recent) },
        { key: 'applied', label: t('picker.applied'), options: take(suggestions.applied) },
        { key: 'latest', label: t('picker.latest'), options: take(suggestions.latest) },
      ].filter((group) => group.options.length > 0);
    }

    const result: Group[] = [];
    if (searchState === 'done' && found) {
      const needle = foldText(trimmed);
      const jobs = company
        ? found.jobs.filter(
            (job) => job.company.id === company.id && foldText(job.title).includes(needle),
          )
        : found.jobs;
      if (!company) {
        const companies = new Map<string, CompanyChoice>();
        for (const job of found.jobs) {
          if (foldText(job.company.name).includes(needle))
            companies.set(job.company.id, job.company);
        }
        const options = [...companies.values()]
          .slice(0, 3)
          .map((item): Option => ({ kind: 'company', company: item }));
        if (options.length > 0) {
          result.push({ key: 'companies', label: t('picker.companies'), options });
        }
      }
      if (jobs.length > 0) {
        result.push({
          key: 'jobs',
          label: t('picker.jobs'),
          options: jobs.slice(0, 10).map((job) => ({ kind: 'job', job: toJobChoice(job) })),
        });
      }
    }
    result.push({ key: 'paste', label: t('picker.other'), options: [{ kind: 'paste' }] });
    return result;
  }, [query, suggestions, searchState, found, trimmed, company, t]);

  const options = groups.flatMap((group) => group.options);
  const active = activeIndex < options.length ? activeIndex : -1;
  const optionId = (index: number) => `${listId}-option-${index}`;
  const hasMatches = groups.some((group) => group.key !== 'paste');

  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  function loadSuggestions() {
    if (suggestionsRequested.current) return;
    suggestionsRequested.current = true;
    async function load() {
      const [applied, latest] = await Promise.allSettled([
        listMyApplications(),
        searchJobs({ limit: SUGGESTIONS_PER_GROUP }),
      ]);
      setSuggestions({
        recent: readRecent(),
        applied:
          applied.status === 'fulfilled'
            ? applied.value.data.map((item) => ({
                id: item.jobId,
                title: item.jobTitle,
                company: item.companyName,
              }))
            : [],
        latest: latest.status === 'fulfilled' ? latest.value.data.map(toJobChoice) : [],
      });
    }
    void load();
  }

  function choose(option: Option) {
    if (option.kind === 'job') {
      rememberJob(option.job);
      setSuggestions((current) => current && { ...current, recent: readRecent() });
      setOpen(false);
      setActiveIndex(-1);
      onChange(option.job);
    } else if (option.kind === 'company') {
      setCompany(option.company);
      setKeyword('');
      setActiveIndex(-1);
    } else {
      setOpen(false);
      onPasteInstead();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const count = options.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (count === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const start = active < 0 ? (step > 0 ? -1 : count) : active;
      setActiveIndex((start + step + count) % count);
    } else if (event.key === 'Enter') {
      // Enter picks an option; it never submits the form from here.
      event.preventDefault();
      const option = open && active >= 0 ? options[active] : undefined;
      if (option) choose(option);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'Backspace' && keyword === '' && company) {
      setCompany(null);
    }
  }

  if (value) {
    return <SelectedJob job={value} onChange={() => onChange(null)} />;
  }

  const showPopup = open;
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-control border border-input bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
        {company && (
          <span className="inline-flex max-w-1/2 shrink-0 items-center gap-1 rounded-full bg-primary-subtle py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-subtle-foreground">
            <span className="truncate">{company.name}</span>
            <button
              type="button"
              aria-label={t('picker.clearCompany')}
              className="rounded-full p-0.5 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => {
                setCompany(null);
                inputRef.current?.focus();
              }}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          role="combobox"
          aria-label={t('searchJobs')}
          aria-expanded={showPopup}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPopup && active >= 0 ? optionId(active) : undefined}
          placeholder={company ? t('picker.filterCompanyPlaceholder') : t('searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-subtle-foreground"
          value={keyword}
          onFocus={() => {
            setOpen(true);
            loadSuggestions();
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            setKeyword(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
        />
      </div>

      {showPopup && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-card bg-surface p-2 shadow-card-hover">
          <div role="status" className="text-sm text-muted-foreground">
            {!query && !suggestions && <SkeletonRows />}
            {!query && suggestions && groups.length === 0 && (
              <p className="px-2 py-2">{t('picker.typeHint')}</p>
            )}
            {searchState === 'loading' && (
              <>
                <span className="sr-only">{t('picker.searching')}</span>
                <SkeletonRows />
              </>
            )}
            {searchState === 'error' && (
              <p className="px-2 py-2 text-danger">{t('picker.searchError')}</p>
            )}
            {searchState === 'done' && !hasMatches && (
              <p className="px-2 py-2">{t('picker.noResults', { keyword: trimmed || query })}</p>
            )}
          </div>

          <div id={listId} role="listbox" aria-label={t('jobResults')}>
            {groups.map((group) => (
              <div key={group.key} role="group" aria-labelledby={`${listId}-${group.key}`}>
                <div
                  id={`${listId}-${group.key}`}
                  className="px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-subtle-foreground uppercase"
                >
                  {group.label}
                </div>
                {group.options.map((option) => {
                  const index = options.indexOf(option);
                  const rowProps = {
                    id: optionId(index),
                    active: index === active,
                    onPick: () => choose(option),
                    onHover: () => setActiveIndex(index),
                  };
                  if (option.kind === 'job') {
                    const meta = jobMeta(option.job);
                    return (
                      <OptionRow key={`${group.key}-${option.job.id}`} {...rowProps}>
                        <CompanyAvatar name={option.job.company} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            <Highlight text={option.job.title} keyword={trimmed} />
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            <Highlight text={option.job.company} keyword={trimmed} />
                            {meta && ` · ${meta}`}
                          </span>
                        </span>
                      </OptionRow>
                    );
                  }
                  if (option.kind === 'company') {
                    return (
                      <OptionRow key={`company-${option.company.id}`} {...rowProps}>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-muted-foreground">
                          <Building2 className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            <Highlight text={option.company.name} keyword={trimmed} />
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {t('picker.companyHint')}
                          </span>
                        </span>
                      </OptionRow>
                    );
                  }
                  return (
                    <OptionRow key="paste" {...rowProps}>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-muted-foreground">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm text-foreground">{t('picker.pasteInstead')}</span>
                    </OptionRow>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
