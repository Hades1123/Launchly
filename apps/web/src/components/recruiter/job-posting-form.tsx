'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileText,
  ListOrdered,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  Plus,
  Save,
  Send,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
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
  type JobPublicationStatus,
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
  roundsSummary,
  type RoundRow,
  type RoundRowErrors,
} from '@/components/recruiter/round-rows-editor';
import { DeleteDraftButton } from '@/components/recruiter/delete-draft-button';
import {
  JOB_LEVEL_LABELS,
  JobStatusBadge,
  jobMetaText,
  jobTitleText,
  salaryText,
} from '@/components/recruiter/job-status-badge';
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

const LEVEL_HINTS: Record<JobLevel, string> = {
  INTERN: 'Sinh viên, thực tập',
  FRESHER: 'Mới tốt nghiệp, dưới 1 năm',
  JUNIOR: 'Có kinh nghiệm thực tế, 1–2 năm',
};

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
    level: job.level ?? '',
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
    level: form.level || null,
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

type SectionId = 'basics' | 'description' | 'salary' | 'rounds' | 'notes';

type SectionInfo = {
  id: SectionId;
  title: string;
  icon: LucideIcon;
  /** `null` for an optional section, otherwise whether submit has what it needs from it. */
  done: boolean | null;
  hasError: boolean;
};

/** The form's sections in order, with what "Gửi duyệt" still needs from each. */
function sectionsOf(form: FormState, errors: FormErrors): SectionInfo[] {
  return [
    {
      id: 'basics',
      title: 'Thông tin cơ bản',
      icon: BriefcaseBusiness,
      done: Boolean(form.title.trim() && form.level && form.location && form.industry),
      hasError: Boolean(errors.title || errors.level || errors.location || errors.industry),
    },
    {
      id: 'description',
      title: 'Mô tả công việc',
      icon: FileText,
      done: Boolean(form.description.trim()),
      hasError: Boolean(errors.description || errors.requirements || errors.benefits),
    },
    {
      id: 'salary',
      title: 'Mức lương',
      icon: Banknote,
      done: form.salaryHidden || Boolean(form.salaryMin.trim() && form.salaryMax.trim()),
      hasError: Boolean(errors.salaryMin || errors.salaryMax),
    },
    {
      id: 'rounds',
      title: 'Quy trình tuyển dụng',
      icon: ListOrdered,
      done:
        form.rounds.length > 0 &&
        form.rounds.every((r) => r.name.trim() && r.format && r.duration.trim()),
      hasError: Boolean(errors.rounds || errors.roundRows),
    },
    {
      id: 'notes',
      title: 'Ghi chú cho ứng viên',
      icon: MessageSquareText,
      done: null,
      hasError: Boolean(errors.notes),
    },
  ];
}

const sectionAnchor = (id: SectionId) => `job-section-${id}`;

const timeFormat = new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short' });

type Loaded = { kind: 'loading' } | { kind: 'error'; text: string } | { kind: 'ready' };

type Saved = { status: JobPublicationStatus; reason: string | null; at: string };

/**
 * Job posting form for a new job (`jobId` omitted), an existing draft, or a rejected job being
 * fixed and resubmitted. Rendered inside the recruiter shell, which has already checked the role
 * and loaded the company. A draft saves whatever has been typed; submit checks everything.
 */
export function JobPostingForm({ jobId, justSaved }: { jobId?: string; justSaved?: boolean }) {
  const router = useRouter();
  const company = useRecruiterCompany();
  const formRef = useRef<HTMLFormElement>(null);
  /** Set when a save fails validation, so the next render moves focus to the first error. */
  const focusFirstError = useRef(false);
  const [loaded, setLoaded] = useState<Loaded>(jobId ? { kind: 'loading' } : { kind: 'ready' });
  const [form, setForm] = useState<FormState>(emptyForm);
  /** The saved job's status (none yet for a new one), the admin's reason, and when it was saved. */
  const [saved, setSaved] = useState<Saved | null>(null);
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
        // Pending, approved or closed jobs are read-only: show them on the detail page.
        if (!isJobEditable(job.status)) return router.replace(`/recruiter/jobs/${id}`);
        setForm(formFrom(job));
        setSaved({ status: job.status, reason: job.moderationReason, at: job.updatedAt });
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

  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    const first = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-form-error]',
    );
    if (!first) return;
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (first.matches('input, select, textarea')) first.focus({ preventScroll: true });
  }, [errors]);

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }));
    setErrors({});
  }

  function showErrors(next: FormErrors) {
    focusFirstError.current = true;
    setErrors(next);
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
      showErrors(toFormErrors(parsed.error.issues, form, sentRounds));
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
      setSaved({ status: job.status, reason: job.moderationReason, at: job.updatedAt });
      setMessage({
        tone: 'success',
        text:
          job.status === 'REJECTED'
            ? 'Đã lưu thay đổi. Tin vẫn ở trạng thái Bị từ chối cho đến khi bạn gửi duyệt lại.'
            : 'Đã lưu bản nháp.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        showErrors(toFormErrors(error.details as ErrorDetail[], form, sentRounds));
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
  if (loaded.kind === 'loading' || company.kind === 'loading') return <FormSkeleton />;
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
  const { name: companyName, moderationStatus } = company.company;
  if (moderationStatus !== 'APPROVED') {
    return (
      <Notice tone="warning">
        {moderationStatus === 'PENDING'
          ? `Công ty ${companyName} đang chờ quản trị viên duyệt. Bạn chỉ có thể đăng tin sau khi công ty được duyệt.`
          : `Hồ sơ công ty ${companyName} đã bị từ chối. Bạn chỉ có thể đăng tin sau khi công ty được duyệt.`}
      </Notice>
    );
  }

  const roundErrors = form.rounds.map((r) => errors.roundRows?.[r.key] ?? {});
  const sections = sectionsOf(form, errors);
  const sectionById = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<
    SectionId,
    SectionInfo
  >;
  const required = sections.filter((s) => s.done !== null);
  const ready = required.filter((s) => s.done).length;
  const rejected = saved?.status === 'REJECTED';
  const requirementCount = lines(form.requirements).length;
  const benefitCount = lines(form.benefits).length;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-12">
      {rejected && (
        <div
          role="status"
          className="flex gap-3 rounded-card border border-danger/30 bg-danger-subtle p-4 text-sm text-danger lg:col-span-12"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Tin đã bị quản trị viên từ chối.</p>
            {saved?.reason && <p>Lý do: {saved.reason}</p>}
            <p>Hãy sửa theo góp ý rồi nhấn “Gửi duyệt lại” để quản trị viên xem xét lần nữa.</p>
          </div>
        </div>
      )}

      <div className="space-y-6 lg:col-span-8">
        <FormSection step={1} info={sectionById.basics}>
          <Field
            label={<Required>Vị trí tuyển dụng</Required>}
            error={errors.title}
            hint="Tên vị trí rõ ràng, ví dụ kèm công nghệ chính hoặc nhóm làm việc."
          >
            <input
              className={cn(fieldClass(errors.title), 'min-h-12 text-base font-medium')}
              value={form.title}
              maxLength={MAX_JOB_TITLE_LENGTH}
              placeholder="Ví dụ: Thực tập sinh Backend Node.js"
              onChange={(e) => patch({ title: e.target.value })}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-semibold text-foreground">
              <Required>Cấp bậc</Required>
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {JOB_LEVELS.map((level) => (
                <OptionCard
                  key={level}
                  name="job-level"
                  checked={form.level === level}
                  invalid={Boolean(errors.level)}
                  onSelect={() => patch({ level })}
                  title={JOB_LEVEL_LABELS[level]}
                  hint={LEVEL_HINTS[level]}
                />
              ))}
            </div>
            {errors.level && (
              <p data-form-error className="text-xs text-danger">
                {errors.level}
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={<Required>Địa điểm</Required>} error={errors.location}>
              <select
                className={fieldClass(errors.location)}
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                aria-invalid={Boolean(errors.location)}
              >
                <option value="">Chọn địa điểm…</option>
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
                <option value="">Chọn ngành nghề…</option>
                {JOB_INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection step={2} info={sectionById.description}>
          <Field
            label={
              <LabelRow aside={`${form.description.length}/${MAX_JOB_DESCRIPTION_LENGTH}`}>
                <Required>Mô tả công việc</Required>
              </LabelRow>
            }
            error={errors.description}
          >
            <textarea
              className={cn(fieldClass(errors.description), 'min-h-40 py-3 leading-relaxed')}
              value={form.description}
              maxLength={MAX_JOB_DESCRIPTION_LENGTH}
              placeholder="Ứng viên sẽ làm gì hằng ngày, làm cùng ai và tạo ra kết quả gì?"
              onChange={(e) => patch({ description: e.target.value })}
              aria-invalid={Boolean(errors.description)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={<LabelRow aside={`${requirementCount} mục`}>Yêu cầu</LabelRow>}
              hint="Mỗi dòng là một yêu cầu."
              error={errors.requirements}
            >
              <textarea
                className={cn(fieldClass(errors.requirements), 'min-h-32 py-3 leading-relaxed')}
                value={form.requirements}
                placeholder={'Biết Node.js hoặc Java\nĐọc hiểu tài liệu tiếng Anh'}
                onChange={(e) => patch({ requirements: e.target.value })}
              />
            </Field>
            <Field
              label={<LabelRow aside={`${benefitCount} mục`}>Quyền lợi</LabelRow>}
              hint="Mỗi dòng là một quyền lợi."
              error={errors.benefits}
            >
              <textarea
                className={cn(fieldClass(errors.benefits), 'min-h-32 py-3 leading-relaxed')}
                value={form.benefits}
                placeholder={'Phụ cấp hằng tháng\nMentor 1-1'}
                onChange={(e) => patch({ benefits: e.target.value })}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection step={3} info={sectionById.salary}>
          <label
            className={cn(
              'relative flex cursor-pointer items-center justify-between gap-4 rounded-control border p-4 transition-colors',
              form.salaryHidden ? 'border-primary bg-primary-subtle' : 'border-border',
              'has-focus-visible:ring-2 has-focus-visible:ring-ring',
            )}
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">Lương thỏa thuận</span>
              <span className="block text-xs text-muted-foreground">
                Ẩn mức lương với ứng viên; hệ thống không lưu con số nào.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="absolute inset-0 cursor-pointer opacity-0"
              checked={form.salaryHidden}
              onChange={(e) => patch({ salaryHidden: e.target.checked })}
            />
            <span
              aria-hidden
              className={cn(
                'pointer-events-none flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
                form.salaryHidden ? 'bg-primary' : 'bg-input',
              )}
            >
              <span
                className={cn(
                  'size-5 rounded-full bg-surface shadow-card transition-transform',
                  form.salaryHidden && 'translate-x-5',
                )}
              />
            </span>
          </label>
          {!form.salaryHidden && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField
                label="Lương tối thiểu (USD/tháng)"
                value={form.salaryMin}
                error={errors.salaryMin}
                placeholder="300"
                onChange={(salaryMin) => patch({ salaryMin })}
              />
              <MoneyField
                label="Lương tối đa (USD/tháng)"
                value={form.salaryMax}
                error={errors.salaryMax}
                placeholder="500"
                onChange={(salaryMax) => patch({ salaryMax })}
              />
            </div>
          )}
        </FormSection>

        <FormSection
          step={4}
          info={sectionById.rounds}
          description={`Ứng viên sẽ thấy các vòng theo đúng thứ tự này. ${roundsSummary(form.rounds)}.`}
        >
          <RoundRowsEditor
            rows={form.rounds}
            errors={roundErrors}
            onChange={(rounds) => patch({ rounds })}
          />
          {errors.rounds && (
            <p data-form-error className="text-sm text-danger">
              {errors.rounds}
            </p>
          )}
        </FormSection>

        <FormSection
          step={5}
          info={sectionById.notes}
          badge={`${form.notes.length}/${MAX_JOB_NOTES}`}
          description="Những điều ứng viên cần biết hoặc chuẩn bị trước khi ứng tuyển."
        >
          {form.notes.length === 0 ? (
            <p className="rounded-control bg-surface-muted p-4 text-sm text-muted-foreground">
              Chưa có ghi chú. Ví dụ: “Mang theo laptop khi phỏng vấn tại văn phòng.”
            </p>
          ) : (
            <ol className="space-y-3">
              {form.notes.map((note, index) => (
                <li key={note.key} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-8 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-muted-foreground"
                  >
                    {index + 1}
                  </span>
                  <Field
                    label={
                      <LabelRow aside={`${note.content.length}/${MAX_JOB_NOTE_LENGTH}`}>
                        {`Ghi chú ${index + 1}`}
                      </LabelRow>
                    }
                    className="flex-1"
                  >
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
                    variant="danger-ghost"
                    className="mt-7 p-2.5"
                    aria-label={`Xóa ghi chú ${index + 1}`}
                    onClick={() => patch({ notes: form.notes.filter((n) => n.key !== note.key) })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <Button variant="soft" onClick={addNote}>
            <Plus className="size-4" aria-hidden /> Thêm ghi chú
          </Button>
          {errors.notes && (
            <p role="alert" data-form-error className="text-sm text-danger">
              {errors.notes}
            </p>
          )}
        </FormSection>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <Card className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Đăng tin</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="size-4 shrink-0" aria-hidden /> {companyName}
              </p>
            </div>
            {saved ? (
              <JobStatusBadge status={saved.status} />
            ) : (
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-subtle-foreground">
                Tin mới
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-foreground">Sẵn sàng gửi duyệt</span>
              <span className="text-muted-foreground">
                {ready}/{required.length} mục
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Mức độ hoàn thiện để gửi duyệt"
              aria-valuemin={0}
              aria-valuemax={required.length}
              aria-valuenow={ready}
              className="h-2 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  ready === required.length ? 'bg-success' : 'bg-primary',
                )}
                style={{ width: `${(ready / required.length) * 100}%` }}
              />
            </div>
          </div>

          <nav aria-label="Các mục của tin">
            <ul className="-mx-2 space-y-0.5">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${sectionAnchor(section.id)}`}
                    className="flex items-center gap-3 rounded-control px-2 py-1.5 text-sm transition-colors hover:bg-surface-muted"
                  >
                    <StepMark step={index + 1} done={section.done} hasError={section.hasError} />
                    <span
                      className={cn(
                        'flex-1',
                        section.hasError
                          ? 'text-danger'
                          : section.done
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {section.title}
                    </span>
                    <span className="text-xs text-subtle-foreground">
                      {section.done === null ? 'Tùy chọn' : section.done ? 'Đã có' : 'Còn thiếu'}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="py-2.5" disabled={saving !== null}>
              {saving === 'SUBMIT' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}{' '}
              {rejected ? 'Gửi duyệt lại' : 'Gửi duyệt'}
            </Button>
            <Button variant="soft" disabled={saving !== null} onClick={() => void save('DRAFT')}>
              {saving === 'DRAFT' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}{' '}
              {rejected ? 'Lưu thay đổi' : 'Lưu nháp'}
            </Button>
            <div className="flex items-center justify-between gap-2">
              <Link href="/recruiter/jobs" className={buttonClasses('ghost')}>
                Hủy
              </Link>
              {jobId && saved?.status === 'DRAFT' && (
                <DeleteDraftButton
                  jobId={jobId}
                  title={jobTitleText(form.title)}
                  label="Xóa bản nháp"
                  onDeleted={() => router.push('/recruiter/jobs?deleted=1')}
                />
              )}
            </div>
          </div>

          {message && (
            <p
              role="status"
              className={cn(
                'flex items-start gap-2 rounded-control p-3 text-sm font-medium',
                message.tone === 'success'
                  ? 'bg-success-subtle text-success'
                  : 'bg-danger-subtle text-danger',
              )}
            >
              {message.tone === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              {message.text}
            </p>
          )}
          {saved && (
            <p className="text-xs text-subtle-foreground">
              Lưu lần cuối lúc {timeFormat.format(new Date(saved.at))}.
            </p>
          )}
        </Card>

        <JobPreview form={form} companyName={companyName} />

        <p className="px-1 text-xs leading-relaxed text-subtle-foreground">
          Bạn có thể lưu nháp bất cứ lúc nào, kể cả khi chưa điền đủ; bản nháp chỉ bạn nhìn thấy.
          Khi gửi duyệt, tin cần đủ các mục bắt buộc và sẽ ở trạng thái Chờ duyệt cho đến khi quản
          trị viên duyệt.
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

/** A field label with a counter on the right; the counter is left out of the accessible name. */
function LabelRow({ aside, children }: { aside: string; children: ReactNode }) {
  return (
    <span className="flex items-baseline justify-between gap-2">
      <span>{children}</span>
      <span aria-hidden className="text-xs font-normal text-subtle-foreground tabular-nums">
        {aside}
      </span>
    </span>
  );
}

function StepMark({
  step,
  done,
  hasError,
}: {
  step: number;
  done: boolean | null;
  hasError: boolean;
}) {
  if (hasError) {
    return <CircleAlert className="size-6 shrink-0 text-danger" aria-hidden />;
  }
  if (done) {
    return <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />;
  }
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-xs font-bold text-subtle-foreground"
    >
      {step}
    </span>
  );
}

function FormSection({
  step,
  info,
  description,
  badge,
  children,
}: {
  step: number;
  info: SectionInfo;
  description?: string;
  badge?: string;
  children: ReactNode;
}) {
  const Icon = info.icon;
  return (
    <section
      id={sectionAnchor(info.id)}
      className={cn(
        'scroll-mt-8 overflow-hidden rounded-card bg-surface shadow-card',
        info.hasError && 'ring-1 ring-danger/40',
      )}
    >
      <header className="flex items-start gap-4 border-b border-border px-6 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
            Bước {step}
            {info.done === null && ' · Không bắt buộc'}
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">{info.title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {badge ? (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
            {badge}
          </span>
        ) : (
          info.done && <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        )}
      </header>
      <div className="space-y-5 p-6">{children}</div>
    </section>
  );
}

/** A selectable card for a radio option; the invisible input covers the card. */
function OptionCard({
  name,
  checked,
  invalid,
  onSelect,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  invalid: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors',
        'has-focus-visible:ring-2 has-focus-visible:ring-ring',
        checked
          ? 'border-primary bg-primary-subtle'
          : invalid
            ? 'border-danger hover:bg-surface-muted'
            : 'border-input hover:border-primary hover:bg-surface-muted',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-primary' : 'border-input',
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function MoneyField({
  label,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} error={error}>
      <span className="relative block">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-subtle-foreground"
        >
          $
        </span>
        <input
          className={cn(fieldClass(error), 'pr-16 pl-7 tabular-nums')}
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-subtle-foreground"
        >
          / tháng
        </span>
      </span>
    </Field>
  );
}

/** Roughly how the job card will read to candidates once it is approved. */
function JobPreview({ form, companyName }: { form: FormState; companyName: string }) {
  const salary = {
    hidden: form.salaryHidden,
    min: amount(form.salaryMin),
    max: amount(form.salaryMax),
  };
  const validSalary =
    salary.hidden ||
    [salary.min, salary.max].every((v) => v === null || (Number.isInteger(v) && v >= 0));
  return (
    <Card className="space-y-3 p-5">
      <p className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
        Xem trước với ứng viên
      </p>
      <div className="space-y-3 rounded-control border border-border p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle font-display font-bold text-primary">
            {companyName.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'font-display font-semibold break-words',
                form.title.trim() ? 'text-foreground' : 'text-subtle-foreground italic',
              )}
            >
              {form.title.trim() || 'Vị trí tuyển dụng'}
            </p>
            <p className="truncate text-sm text-muted-foreground">{companyName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {jobMetaText({ level: form.level || null, location: form.location })}
          </span>
          <span className="flex items-center gap-1">
            <Banknote className="size-3.5" aria-hidden />
            {validSalary
              ? salary.hidden
                ? 'Thỏa thuận'
                : salaryText(salary)
              : 'Mức lương chưa hợp lệ'}
          </span>
        </div>
        {form.rounds.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ListOrdered className="size-3.5" aria-hidden /> {roundsSummary(form.rounds)}
          </p>
        )}
      </div>
    </Card>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-12" aria-busy aria-label="Đang tải">
      <div className="space-y-6 lg:col-span-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-card bg-surface shadow-card" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-card bg-surface shadow-card lg:col-span-4" />
    </div>
  );
}

function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warning' | 'danger';
  children: ReactNode;
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
