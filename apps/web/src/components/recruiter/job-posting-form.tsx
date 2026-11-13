'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Circle, LoaderCircle, Plus, Send, Trash2 } from 'lucide-react';
import {
  JOB_INDUSTRIES,
  JOB_LEVELS,
  JOB_LOCATIONS,
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_JOB_NOTE_LENGTH,
  MAX_JOB_NOTES,
  MAX_JOB_SALARY,
  MAX_JOB_TITLE_LENGTH,
  isJobEditable,
  saveJobSchema,
  type ErrorDetail,
  type JobLevel,
  type RecruiterJob,
  type SaveJobAction,
  type SaveJobInput,
} from '@launchly/shared';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Field,
  ROUND_ERROR_TEXT,
  RoundRowsEditor,
  fieldClass,
  roundRowsFrom,
  type RoundRow,
  type RoundRowErrors,
} from '@/components/recruiter/round-rows-editor';
import { JOB_LEVEL_LABELS, JobStatusBadge } from '@/components/recruiter/job-status-badge';
import { useRecruiterCompany } from '@/components/recruiter/recruiter-shell';
import { ApiError } from '@/lib/api/http';
import { createJob, getMyJob, updateJob } from '@/lib/api/recruiter-jobs';
import { cn } from '@/lib/cn';

type NoteRow = { key: string; content: string };

type FormState = {
  title: string;
  level: JobLevel | '';
  location: string;
  industry: string;
  description: string;
  /** One item per line. */
  requirements: string;
  benefits: string;
  salaryMin: string;
  salaryMax: string;
  salaryHidden: boolean;
  rounds: RoundRow[];
  notes: NoteRow[];
};

type TextField = 'title' | 'level' | 'location' | 'industry' | 'description';
type FormErrors = Partial<
  Record<TextField | 'requirements' | 'benefits' | 'salaryMin' | 'salaryMax', string>
> & {
  rounds?: string;
  roundRows?: Record<string, RoundRowErrors>;
  notes?: string;
};

const NOTES_LIMIT_TEXT = `Tối đa ${MAX_JOB_NOTES} ghi chú.`;

const emptyForm = (): FormState => ({
  title: '',
  level: '',
  location: '',
  industry: '',
  description: '',
  requirements: '',
  benefits: '',
  salaryMin: '',
  salaryMax: '',
  salaryHidden: false,
  rounds: [],
  notes: [],
});

function formFrom(job: RecruiterJob): FormState {
  return {
    title: job.title,
    level: job.level,
    location: job.location,
    industry: job.industry ?? '',
    description: job.description,
    requirements: job.requirements.join('\n'),
    benefits: job.benefits.join('\n'),
    salaryMin: job.salary.min?.toString() ?? '',
    salaryMax: job.salary.max?.toString() ?? '',
    salaryHidden: job.salary.hidden,
    rounds: roundRowsFrom(job.rounds),
    notes: job.notes.map((n) => ({ key: n.id, content: n.content })),
  };
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const amount = (text: string) => (text.trim() === '' ? null : Number(text));

const isBlankRound = (r: RoundRow) => !r.name.trim() && !r.format && !r.duration.trim();

/**
 * Builds the request body. A draft drops rounds the recruiter left completely
 * empty; `sentRounds` keeps the rows that were sent so errors map back to them.
 */
function toPayload(form: FormState, action: SaveJobAction) {
  const sentRounds = action === 'DRAFT' ? form.rounds.filter((r) => !isBlankRound(r)) : form.rounds;
  const payload = {
    action,
    title: form.title,
    description: form.description,
    level: form.level,
    location: form.location,
    industry: form.industry || null,
    requirements: lines(form.requirements),
    benefits: lines(form.benefits),
    salary: {
      hidden: form.salaryHidden,
      min: form.salaryHidden ? null : amount(form.salaryMin),
      max: form.salaryHidden ? null : amount(form.salaryMax),
    },
    rounds: sentRounds.map((r) => ({
      name: r.name,
      format: r.format || null,
      estimatedDurationMinutes: amount(r.duration),
    })),
    notes: form.notes.map((n) => n.content.trim()).filter(Boolean),
  };
  return { payload, sentRounds };
}

function salaryError(form: FormState, key: 'min' | 'max'): string {
  const raw = key === 'min' ? form.salaryMin : form.salaryMax;
  const value = amount(raw);
  if (value !== null && (!Number.isInteger(value) || value < 0 || value > MAX_JOB_SALARY)) {
    return `Nhập số nguyên từ 0 đến ${MAX_JOB_SALARY.toLocaleString('vi-VN')}.`;
  }
  if (key === 'max' && value !== null && amount(form.salaryMin) !== null) {
    return 'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.';
  }
  return 'Nhập mức lương hoặc chọn lương thỏa thuận.';
}

const roundFieldByPath: Record<string, keyof RoundRowErrors> = {
  name: 'name',
  format: 'format',
  estimatedDurationMinutes: 'duration',
};

/** Turns schema issues (client) or `details` (server, prefixed with `body`) into field messages. */
function toFormErrors(
  issues: { path: PropertyKey[] }[],
  form: FormState,
  sentRounds: RoundRow[],
): FormErrors {
  const errors: FormErrors = {};
  for (const issue of issues) {
    const path = issue.path[0] === 'body' ? issue.path.slice(1) : issue.path;
    const [head, index, field] = path.map(String);
    switch (head) {
      case 'title':
        errors.title = form.title.trim()
          ? `Tối đa ${MAX_JOB_TITLE_LENGTH} ký tự.`
          : 'Vị trí tuyển dụng là bắt buộc.';
        break;
      case 'description':
        errors.description = form.description.trim()
          ? `Tối đa ${MAX_JOB_DESCRIPTION_LENGTH} ký tự.`
          : 'Mô tả công việc là bắt buộc.';
        break;
      case 'level':
        errors.level = 'Hãy chọn cấp bậc.';
        break;
      case 'location':
        errors.location = 'Hãy chọn địa điểm.';
        break;
      case 'industry':
        errors.industry = 'Hãy chọn ngành nghề.';
        break;
      case 'requirements':
      case 'benefits':
        errors[head] = 'Tối đa 20 dòng, mỗi dòng tối đa 300 ký tự.';
        break;
      case 'salary':
        if (index === 'min') errors.salaryMin = salaryError(form, 'min');
        if (index === 'max') errors.salaryMax = salaryError(form, 'max');
        break;
      case 'rounds': {
        const row = index === undefined ? undefined : sentRounds[Number(index)];
        const key = field === undefined ? undefined : roundFieldByPath[field];
        if (row && key) {
          errors.roundRows = {
            ...errors.roundRows,
            [row.key]: { ...errors.roundRows?.[row.key], [key]: ROUND_ERROR_TEXT[key] },
          };
        } else {
          errors.rounds = 'Thêm ít nhất một vòng tuyển dụng.';
        }
        break;
      }
      case 'notes':
        errors.notes =
          index === undefined
            ? NOTES_LIMIT_TEXT
            : `Mỗi ghi chú tối đa ${MAX_JOB_NOTE_LENGTH} ký tự.`;
        break;
    }
  }
  return errors;
}

function saveErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN') {
      return 'Bạn không thể đăng tin: công ty chưa được duyệt hoặc tin này không thuộc về bạn.';
    }
    if (error.code === 'CONFLICT') return 'Tin này đã được gửi duyệt nên không thể sửa nữa.';
    if (error.code === 'VALIDATION_ERROR') return 'Vui lòng kiểm tra các trường được đánh dấu.';
    return error.message;
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

/** What "Gửi duyệt" needs, shown as a checklist next to the form. */
function submitChecklist(form: FormState): { label: string; done: boolean }[] {
  return [
    {
      label: 'Vị trí và mô tả công việc',
      done: Boolean(form.title.trim() && form.description.trim()),
    },
    {
      label: 'Cấp bậc, địa điểm, ngành nghề',
      done: Boolean(form.level && form.location && form.industry),
    },
    {
      label: 'Mức lương hoặc lương thỏa thuận',
      done: form.salaryHidden || Boolean(form.salaryMin.trim() && form.salaryMax.trim()),
    },
    {
      label: 'Quy trình có vòng, mỗi vòng đủ thông tin',
      done:
        form.rounds.length > 0 &&
        form.rounds.every((r) => r.name.trim() && r.format && r.duration.trim()),
    },
  ];
}

type Loaded = { kind: 'loading' } | { kind: 'error'; text: string } | { kind: 'ready' };

/**
 * Job posting form for a new job (`jobId` omitted) or an existing draft. Rendered inside the
 * recruiter shell, which has already checked the role and loaded the company.
 */
export function JobPostingForm({ jobId, justSaved }: { jobId?: string; justSaved?: boolean }) {
  const router = useRouter();
  const company = useRecruiterCompany();
  const [loaded, setLoaded] = useState<Loaded>(jobId ? { kind: 'loading' } : { kind: 'ready' });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState<SaveJobAction | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    justSaved ? { tone: 'success', text: 'Đã lưu bản nháp.' } : null,
  );

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    async function load(id: string) {
      try {
        const job = await getMyJob(id);
        if (!active) return;
        // Submitted, approved or rejected jobs are read-only: show them on the detail page.
        if (!isJobEditable(job.status)) return router.replace(`/recruiter/jobs/${id}`);
        setForm(formFrom(job));
        setLoaded({ kind: 'ready' });
      } catch (error) {
        if (!active) return;
        const text =
          error instanceof ApiError && error.code === 'FORBIDDEN'
            ? 'Bạn không có quyền sửa tin tuyển dụng này.'
            : error instanceof ApiError && error.code === 'NOT_FOUND'
              ? 'Không tìm thấy tin tuyển dụng.'
              : saveErrorText(error);
        setLoaded({ kind: 'error', text });
      }
    }
    void load(jobId);
    return () => {
      active = false;
    };
  }, [jobId, router]);

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
    setErrors({});
  }

  function addNote() {
    if (form.notes.length >= MAX_JOB_NOTES) {
      setErrors({ notes: NOTES_LIMIT_TEXT });
      return;
    }
    patch({ notes: [...form.notes, { key: crypto.randomUUID(), content: '' }] });
  }

  async function save(action: SaveJobAction) {
    setMessage(null);
    const { payload, sentRounds } = toPayload(form, action);
    const parsed = saveJobSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toFormErrors(parsed.error.issues, form, sentRounds));
      setMessage({ tone: 'danger', text: 'Vui lòng kiểm tra các trường được đánh dấu.' });
      return;
    }
    setSaving(action);
    try {
      const input: SaveJobInput = parsed.data;
      const job = jobId ? await updateJob(jobId, input) : await createJob(input);
      if (action === 'SUBMIT') {
        router.push(`/recruiter/jobs?submitted=${job.id}`);
        return;
      }
      if (!jobId) {
        router.replace(`/recruiter/jobs/${job.id}/edit?saved=1`);
        return;
      }
      setForm(formFrom(job));
      setMessage({ tone: 'success', text: 'Đã lưu bản nháp.' });
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        setErrors(toFormErrors(error.details as ErrorDetail[], form, sentRounds));
      }
      setMessage({ tone: 'danger', text: saveErrorText(error) });
    } finally {
      setSaving(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void save('SUBMIT');
  }

  if (loaded.kind === 'error') return <Notice tone="danger">{loaded.text}</Notice>;
  if (company.kind === 'error') return <Notice tone="danger">{company.text}</Notice>;
  if (loaded.kind === 'loading' || company.kind === 'loading') {
    return <div className="h-96 animate-pulse rounded-card bg-surface shadow-card" />;
  }
  if (company.kind === 'none') {
    return (
      <Notice>
        Bạn cần đăng ký thông tin công ty trước khi đăng tin tuyển dụng.{' '}
        <Link href="/company/register" className="font-semibold text-primary hover:underline">
          Đăng ký công ty
        </Link>
      </Notice>
    );
  }
  const { name, moderationStatus } = company.company;
  if (moderationStatus !== 'APPROVED') {
    return (
      <Notice tone="warning">
        {moderationStatus === 'PENDING'
          ? `Công ty ${name} đang chờ quản trị viên duyệt. Bạn chỉ có thể đăng tin sau khi công ty được duyệt.`
          : `Hồ sơ công ty ${name} đã bị từ chối. Bạn chỉ có thể đăng tin sau khi công ty được duyệt.`}
      </Notice>
    );
  }

  const roundErrors = form.rounds.map((r) => errors.roundRows?.[r.key] ?? {});
  const checklist = submitChecklist(form);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Section title="Thông tin công việc">
          <Field label={<Required>Vị trí tuyển dụng</Required>} error={errors.title}>
            <input
              className={fieldClass(errors.title)}
              value={form.title}
              maxLength={MAX_JOB_TITLE_LENGTH}
              placeholder="Ví dụ: Thực tập sinh Backend Node.js"
              onChange={(e) => patch({ title: e.target.value })}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={<Required>Cấp bậc</Required>} error={errors.level}>
              <select
                className={fieldClass(errors.level)}
                value={form.level}
                onChange={(e) => patch({ level: e.target.value as JobLevel | '' })}
                aria-invalid={Boolean(errors.level)}
              >
                <option value="">Chọn…</option>
                {JOB_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {JOB_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<Required>Địa điểm</Required>} error={errors.location}>
              <select
                className={fieldClass(errors.location)}
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                aria-invalid={Boolean(errors.location)}
              >
                <option value="">Chọn…</option>
                {JOB_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<Required>Ngành nghề</Required>} error={errors.industry}>
              <select
                className={fieldClass(errors.industry)}
                value={form.industry}
                onChange={(e) => patch({ industry: e.target.value })}
                aria-invalid={Boolean(errors.industry)}
              >
                <option value="">Chọn…</option>
                {JOB_INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={<Required>Mô tả công việc</Required>} error={errors.description}>
            <textarea
              className={cn(fieldClass(errors.description), 'min-h-32 py-2')}
              value={form.description}
              maxLength={MAX_JOB_DESCRIPTION_LENGTH}
              onChange={(e) => patch({ description: e.target.value })}
              aria-invalid={Boolean(errors.description)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Yêu cầu" hint="Mỗi dòng là một yêu cầu." error={errors.requirements}>
              <textarea
                className={cn(fieldClass(errors.requirements), 'min-h-24 py-2')}
                value={form.requirements}
                onChange={(e) => patch({ requirements: e.target.value })}
              />
            </Field>
            <Field label="Quyền lợi" hint="Mỗi dòng là một quyền lợi." error={errors.benefits}>
              <textarea
                className={cn(fieldClass(errors.benefits), 'min-h-24 py-2')}
                value={form.benefits}
                onChange={(e) => patch({ benefits: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Mức lương">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.salaryHidden}
              onChange={(e) => patch({ salaryHidden: e.target.checked })}
            />
            Lương thỏa thuận (ẩn mức lương với ứng viên)
          </label>
          {!form.salaryHidden && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lương tối thiểu (USD/tháng)" error={errors.salaryMin}>
                <input
                  className={fieldClass(errors.salaryMin)}
                  inputMode="numeric"
                  value={form.salaryMin}
                  onChange={(e) => patch({ salaryMin: e.target.value })}
                  aria-invalid={Boolean(errors.salaryMin)}
                />
              </Field>
              <Field label="Lương tối đa (USD/tháng)" error={errors.salaryMax}>
                <input
                  className={fieldClass(errors.salaryMax)}
                  inputMode="numeric"
                  value={form.salaryMax}
                  onChange={(e) => patch({ salaryMax: e.target.value })}
                  aria-invalid={Boolean(errors.salaryMax)}
                />
              </Field>
            </div>
          )}
        </Section>

        <Section
          title="Quy trình tuyển dụng"
          description="Thêm, sắp xếp và xóa các vòng. Ứng viên sẽ thấy các vòng theo đúng thứ tự này."
        >
          <RoundRowsEditor
            rows={form.rounds}
            errors={roundErrors}
            onChange={(rounds) => patch({ rounds })}
          />
          {errors.rounds && <p className="text-sm text-danger">{errors.rounds}</p>}
        </Section>

        <Section
          title={`Ghi chú cho ứng viên (${form.notes.length}/${MAX_JOB_NOTES})`}
          description="Những điều ứng viên cần biết hoặc chuẩn bị trước khi ứng tuyển."
        >
          <ol className="space-y-3">
            {form.notes.map((note, index) => (
              <li key={note.key} className="flex items-start gap-2">
                <Field label={`Ghi chú ${index + 1}`} className="flex-1">
                  <input
                    className={fieldClass()}
                    value={note.content}
                    maxLength={MAX_JOB_NOTE_LENGTH}
                    onChange={(e) =>
                      patch({
                        notes: form.notes.map((n) =>
                          n.key === note.key ? { ...n, content: e.target.value } : n,
                        ),
                      })
                    }
                  />
                </Field>
                <Button
                  variant="icon"
                  className="mt-7"
                  aria-label={`Xóa ghi chú ${index + 1}`}
                  onClick={() => patch({ notes: form.notes.filter((n) => n.key !== note.key) })}
                >
                  <Trash2 className="size-4 text-danger" aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          <Button variant="soft" onClick={addNote}>
            <Plus className="size-4" aria-hidden /> Thêm ghi chú
          </Button>
          {errors.notes && (
            <p role="alert" className="text-sm text-danger">
              {errors.notes}
            </p>
          )}
        </Section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">Đăng tin</h2>
            {jobId ? (
              <JobStatusBadge status="DRAFT" />
            ) : (
              <span className="text-xs font-semibold text-subtle-foreground">Tin mới</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Công ty: {name}</p>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
              Cần có để gửi duyệt
            </p>
            <ul className="space-y-2 text-sm">
              {checklist.map(({ label, done }) => (
                <li
                  key={label}
                  className={cn(
                    'flex items-center gap-2',
                    done ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <Circle className="size-4 shrink-0" aria-hidden />
                  )}
                  <span>
                    {label}
                    <span className="sr-only">{done ? ' (đã có)' : ' (còn thiếu)'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={saving !== null}>
              {saving === 'SUBMIT' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}{' '}
              Gửi duyệt
            </Button>
            <Button variant="soft" disabled={saving !== null} onClick={() => void save('DRAFT')}>
              {saving === 'DRAFT' && <LoaderCircle className="size-4 animate-spin" aria-hidden />}{' '}
              Lưu nháp
            </Button>
            <Link href="/recruiter/jobs" className={buttonClasses('ghost')}>
              Hủy
            </Link>
          </div>
          {message && (
            <p
              role="status"
              className={cn(
                'rounded-control p-3 text-sm font-medium',
                message.tone === 'success'
                  ? 'bg-success-subtle text-success'
                  : 'bg-danger-subtle text-danger',
              )}
            >
              {message.text}
            </p>
          )}
        </Card>
        <p className="px-1 text-xs text-subtle-foreground">
          Bản nháp chỉ cần vị trí, cấp bậc, địa điểm và mô tả, và chỉ bạn nhìn thấy. Tin gửi duyệt
          sẽ ở trạng thái Chờ duyệt cho đến khi quản trị viên duyệt.
        </p>
      </aside>
    </form>
  );
}

function Required({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-danger">*</span>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <header>
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </Card>
  );
}

function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-card p-6 text-sm shadow-card',
        tone === 'warning' && 'bg-warning-subtle text-warning',
        tone === 'danger' && 'bg-danger-subtle text-danger',
        tone === 'neutral' && 'bg-surface text-muted-foreground',
      )}
    >
      <p role="status">{children}</p>
    </div>
  );
}
