'use client';

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { FileText, LoaderCircle, Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import {
  APPLICATION_STATUSES,
  MAX_STATUS_NOTE_LENGTH,
  RECRUITER_APPLICATION_STATUSES,
  type ApplicationStatus,
  type RecruiterApplication,
  type RecruiterApplicationStatus,
  type RoundDto,
} from '@launchly/shared';
import { StatusBadge } from '@/components/applications/status-badge';
import { Field, fieldClass } from '@/components/recruiter/round-rows-editor';
import { useJobText } from '@/components/recruiter/job-status-badge';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { getJobRounds } from '@/lib/api/job-rounds';
import {
  downloadApplicationResume,
  listJobApplicants,
  updateApplicationStatus,
} from '@/lib/api/recruiter-applications';
import { getMyJob } from '@/lib/api/recruiter-jobs';

type LoadError = 'forbidden' | 'notFound' | 'generic';

type View =
  | { kind: 'loading' }
  | { kind: 'error'; error: LoadError }
  | { kind: 'ready'; jobTitle: string; applicants: RecruiterApplication[]; rounds: RoundDto[] };

type Flash = { tone: 'success' | 'danger'; text: string };

function loadError(error: unknown): LoadError {
  if (error instanceof ApiError && error.status === 403) return 'forbidden';
  if (error instanceof ApiError && error.status === 404) return 'notFound';
  return 'generic';
}

/** Opens the CV in a new tab; the tab is opened first so the popup blocker allows it. */
async function openResume(applicationId: string): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  try {
    const blob = await downloadApplicationResume(applicationId);
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    // The tab has loaded the file well before this; release the in-memory copy.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

/** The recruiter's review table for one job: filter, open CVs and change statuses. */
export function ApplicantsTable({ jobId }: { jobId: string }) {
  const t = useTranslations('recruiter.applicants');
  const tPages = useTranslations('recruiter.pages');
  const jobText = useJobText();
  const format = useFormatter();
  const back = { href: '/recruiter/jobs', label: tPages('jobsBack') };
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [filter, setFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [job, list, { rounds }] = await Promise.all([
          getMyJob(jobId),
          listJobApplicants(jobId),
          getJobRounds(jobId),
        ]);
        if (active) {
          setView({
            kind: 'ready',
            jobTitle: job.title,
            applicants: list.data,
            rounds,
          });
        }
      } catch (error) {
        if (active) setView({ kind: 'error', error: loadError(error) });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  if (view.kind !== 'ready') {
    return (
      <>
        <RecruiterPageHeader title={t('title')} back={back} />
        {view.kind === 'error' ? (
          <p role="alert" className="rounded-card bg-danger-subtle p-4 text-sm text-danger">
            {t(`loadErrors.${view.error}`)}
          </p>
        ) : (
          <div className="h-64 animate-pulse rounded-card bg-surface shadow-card" aria-busy />
        )}
      </>
    );
  }

  const { jobTitle, applicants, rounds } = view;
  const shown = filter === 'ALL' ? applicants : applicants.filter((a) => a.status === filter);

  async function onViewResume(applicant: RecruiterApplication) {
    setFlash(null);
    try {
      await openResume(applicant.id);
    } catch {
      setFlash({ tone: 'danger', text: t('resumeError', { name: applicant.candidate.name }) });
    }
  }

  function onUpdated(updated: RecruiterApplication) {
    setView((current) =>
      current.kind === 'ready'
        ? {
            ...current,
            applicants: current.applicants.map((a) => (a.id === updated.id ? updated : a)),
          }
        : current,
    );
    setEditingId(null);
    setFlash({
      tone: 'success',
      text: t('moved', {
        name: updated.candidate.name,
        status: t(`statuses.${updated.status}`),
      }),
    });
  }

  return (
    <>
      <RecruiterPageHeader
        back={back}
        title={t('titleWithJob', { job: jobText.title(jobTitle) })}
        description={t('count', { count: applicants.length })}
        actions={
          <Field label={t('filter')} className="min-w-48">
            <select
              className={fieldClass()}
              value={filter}
              onChange={(e) => setFilter(e.target.value as ApplicationStatus | 'ALL')}
            >
              <option value="ALL">{t('all')}</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </Field>
        }
      />

      {flash && (
        <p
          role="status"
          className={
            flash.tone === 'success'
              ? 'mb-4 rounded-card bg-success-subtle p-3 text-sm text-success'
              : 'mb-4 rounded-card bg-danger-subtle p-3 text-sm text-danger'
          }
        >
          {flash.text}
        </p>
      )}

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <Users className="size-6 text-subtle-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {applicants.length === 0 ? t('empty.none') : t('empty.noMatch')}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
              <tr>
                <th scope="col" className="px-5 py-3">
                  {t('columns.candidate')}
                </th>
                <th scope="col" className="px-5 py-3">
                  {t('columns.skills')}
                </th>
                <th scope="col" className="px-5 py-3">
                  {t('columns.submitted')}
                </th>
                <th scope="col" className="px-5 py-3">
                  {t('columns.round')}
                </th>
                <th scope="col" className="px-5 py-3">
                  {t('columns.status')}
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((applicant) => (
                <Fragment key={applicant.id}>
                  <tr>
                    <td className="px-5 py-4">
                      <p className="font-display font-semibold text-foreground">
                        {applicant.candidate.name}
                      </p>
                      {applicant.candidate.headline && (
                        <p className="text-muted-foreground">{applicant.candidate.headline}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {applicant.candidate.skills.length === 0 ? (
                          <span className="text-subtle-foreground">—</span>
                        ) : (
                          applicant.candidate.skills.map((skill) => (
                            <Badge key={skill}>{skill}</Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {format.dateTime(new Date(applicant.submittedAt), { dateStyle: 'medium' })}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {applicant.currentStage?.name ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={applicant.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => void onViewResume(applicant)}
                          aria-label={t('viewCvLabel', { name: applicant.candidate.name })}
                        >
                          <FileText className="size-4" aria-hidden /> {t('viewCv')}
                        </Button>
                        <Button
                          variant="soft"
                          aria-expanded={editingId === applicant.id}
                          onClick={() =>
                            setEditingId(editingId === applicant.id ? null : applicant.id)
                          }
                          aria-label={t('updateLabel', { name: applicant.candidate.name })}
                        >
                          {t('update')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {editingId === applicant.id && (
                    <tr className="bg-surface-muted">
                      <td colSpan={6} className="px-5 py-4">
                        <StatusForm
                          applicant={applicant}
                          rounds={rounds}
                          onCancel={() => setEditingId(null)}
                          onUpdated={onUpdated}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusForm({
  applicant,
  rounds,
  onCancel,
  onUpdated,
}: {
  applicant: RecruiterApplication;
  rounds: RoundDto[];
  onCancel: () => void;
  onUpdated: (updated: RecruiterApplication) => void;
}) {
  const t = useTranslations('recruiter.applicants');
  const [status, setStatus] = useState<RecruiterApplicationStatus | ''>('');
  const [stageId, setStageId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!status) {
      setError(t('form.chooseStatus'));
      return;
    }
    if (status === applicant.status) {
      setError(t('form.sameStatus'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateApplicationStatus(applicant.id, {
        status,
        ...(stageId && { stageId }),
        ...(note.trim() && { note: note.trim() }),
      });
      onUpdated(updated);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 403
          ? t('form.forbidden')
          : cause instanceof ApiError && cause.code === 'VALIDATION_ERROR'
            ? cause.message
            : t('form.generic'),
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-4 md:items-end" noValidate>
      <Field label={t('form.newStatus')}>
        <select
          className={fieldClass(error ?? undefined)}
          value={status}
          onChange={(e) => setStatus(e.target.value as RecruiterApplicationStatus | '')}
        >
          <option value="">{t('form.choose')}</option>
          {RECRUITER_APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`statuses.${value}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('form.round')}>
        <select
          className={fieldClass()}
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
        >
          <option value="">{t('form.keepRound')}</option>
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.position}. {round.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('form.note')}>
        <input
          className={fieldClass()}
          value={note}
          maxLength={MAX_STATUS_NOTE_LENGTH}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {t('form.save')}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {t('form.cancel')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger md:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
}
