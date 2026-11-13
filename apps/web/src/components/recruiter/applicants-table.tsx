'use client';

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { FileText, LoaderCircle, Users } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  MAX_STATUS_NOTE_LENGTH,
  RECRUITER_APPLICATION_STATUSES,
  type ApplicationStatus,
  type RecruiterApplication,
  type RecruiterApplicationStatus,
  type RoundDto,
} from '@launchly/shared';
import { statusConfig, StatusBadge } from '@/components/applications/status-badge';
import { Field, fieldClass } from '@/components/recruiter/round-rows-editor';
import { jobTitleText } from '@/components/recruiter/job-status-badge';
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

type View =
  | { kind: 'loading' }
  | { kind: 'error'; text: string }
  | { kind: 'ready'; jobTitle: string; applicants: RecruiterApplication[]; rounds: RoundDto[] };

type Flash = { tone: 'success' | 'danger'; text: string };

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' });

const BACK = { href: '/recruiter/jobs', label: 'Tin tuyển dụng' };

function loadErrorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Bạn không có quyền xem ứng viên của tin tuyển dụng này.';
  }
  if (error instanceof ApiError && error.status === 404) return 'Không tìm thấy tin tuyển dụng.';
  return 'Không thể tải danh sách ứng viên. Vui lòng thử lại.';
}

/** Opens the CV in a new tab; the tab is opened first so the popup blocker allows it. */
async function openResume(applicationId: string): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  try {
    const blob = await downloadApplicationResume(applicationId);
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

/** The recruiter's review table for one job: filter, open CVs and change statuses. */
export function ApplicantsTable({ jobId }: { jobId: string }) {
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
            jobTitle: jobTitleText(job.title),
            applicants: list.data,
            rounds,
          });
        }
      } catch (error) {
        if (active) setView({ kind: 'error', text: loadErrorText(error) });
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
        <RecruiterPageHeader title="Ứng viên" back={BACK} />
        {view.kind === 'error' ? (
          <p role="alert" className="rounded-card bg-danger-subtle p-4 text-sm text-danger">
            {view.text}
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
      setFlash({ tone: 'danger', text: `Không thể mở CV của ${applicant.candidate.name}.` });
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
      text: `Đã chuyển ${updated.candidate.name} sang ${statusConfig[updated.status].label}.`,
    });
  }

  return (
    <>
      <RecruiterPageHeader
        back={BACK}
        title={`Ứng viên · ${jobTitle}`}
        description={`${applicants.length} hồ sơ ứng tuyển`}
        actions={
          <Field label="Lọc theo trạng thái" className="min-w-48">
            <select
              className={fieldClass()}
              value={filter}
              onChange={(e) => setFilter(e.target.value as ApplicationStatus | 'ALL')}
            >
              <option value="ALL">Tất cả</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
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
            {applicants.length === 0
              ? 'Chưa có ứng viên nào ứng tuyển.'
              : 'Không có ứng viên nào ở trạng thái này.'}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Ứng viên
                </th>
                <th scope="col" className="px-5 py-3">
                  Kỹ năng
                </th>
                <th scope="col" className="px-5 py-3">
                  Ngày nộp
                </th>
                <th scope="col" className="px-5 py-3">
                  Vòng hiện tại
                </th>
                <th scope="col" className="px-5 py-3">
                  Trạng thái
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Thao tác
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
                      {dateFormat.format(new Date(applicant.submittedAt))}
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
                          aria-label={`Xem CV của ${applicant.candidate.name}`}
                        >
                          <FileText className="size-4" aria-hidden /> Xem CV
                        </Button>
                        <Button
                          variant="soft"
                          aria-expanded={editingId === applicant.id}
                          onClick={() =>
                            setEditingId(editingId === applicant.id ? null : applicant.id)
                          }
                          aria-label={`Cập nhật trạng thái của ${applicant.candidate.name}`}
                        >
                          Cập nhật
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
  const [status, setStatus] = useState<RecruiterApplicationStatus | ''>('');
  const [stageId, setStageId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!status) {
      setError('Hãy chọn trạng thái mới.');
      return;
    }
    if (status === applicant.status) {
      setError('Ứng viên đã ở trạng thái này.');
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
          ? 'Bạn không có quyền cập nhật ứng viên này.'
          : cause instanceof ApiError && cause.code === 'VALIDATION_ERROR'
            ? cause.message
            : 'Không thể cập nhật trạng thái. Vui lòng thử lại.',
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-4 md:items-end" noValidate>
      <Field label="Trạng thái mới">
        <select
          className={fieldClass(error ?? undefined)}
          value={status}
          onChange={(e) => setStatus(e.target.value as RecruiterApplicationStatus | '')}
        >
          <option value="">Chọn…</option>
          {RECRUITER_APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusConfig[value].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Vòng (tùy chọn)">
        <select
          className={fieldClass()}
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
        >
          <option value="">Giữ nguyên</option>
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.position}. {round.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ghi chú (tùy chọn)">
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
          Lưu thay đổi
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Hủy
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
