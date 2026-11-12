'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import {
  MAX_ROUND_DURATION_MINUTES,
  MAX_ROUNDS,
  MIN_ROUND_DURATION_MINUTES,
  validateRoundDrafts,
  type RoundFormat,
} from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getJobRounds, replaceJobRounds } from '@/lib/api/job-rounds';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

const FORMAT_LABELS: Record<RoundFormat, string> = {
  ONLINE: 'Trực tuyến',
  ONSITE: 'Tại văn phòng',
  PHONE: 'Điện thoại',
  ASSIGNMENT: 'Bài tập',
};

type Row = { key: string; id?: string; name: string; format: RoundFormat | ''; duration: string };
type RowErrors = { name?: string; format?: string; duration?: string };

const newKey = () => crypto.randomUUID();
const emptyRow = (): Row => ({ key: newKey(), name: '', format: '', duration: '' });

function validateRows(rows: Row[]): RowErrors[] {
  return validateRoundDrafts(rows).map((errors) => ({
    ...(errors.name && { name: 'Tên vòng là bắt buộc.' }),
    ...(errors.format && { format: 'Hãy chọn hình thức.' }),
    ...(errors.duration && {
      duration: `Nhập số phút từ ${MIN_ROUND_DURATION_MINUTES} đến ${MAX_ROUND_DURATION_MINUTES}.`,
    }),
  }));
}

const fieldClass = (error?: string) =>
  cn(
    'min-h-11 w-full rounded-control border bg-surface px-3 text-sm text-foreground outline-none transition',
    'focus:border-primary focus:ring-2 focus:ring-ring/20',
    error ? 'border-danger' : 'border-input',
  );

export function RoundsBuilder({ jobId }: { jobId: string }) {
  const { status } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<RowErrors[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || loadedFor.current === jobId) return;
    loadedFor.current = jobId;
    (async () => {
      try {
        const { rounds } = await getJobRounds(jobId);
        setRows(
          rounds.map((r) => ({
            key: r.id,
            id: r.id,
            name: r.name,
            format: r.format ?? '',
            duration: r.estimatedDurationMinutes?.toString() ?? '',
          })),
        );
      } catch (error) {
        loadedFor.current = null;
        setMessage({ tone: 'danger', text: errorMessage(error) });
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, status]);

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setErrors([]);
  }

  function move(index: number, delta: -1 | 1) {
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const found = validateRows(rows);
    if (found.some((e) => Object.keys(e).length > 0)) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      const { rounds } = await replaceJobRounds(jobId, {
        rounds: rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name.trim(),
          // validateRows() above rejects an empty format, so it is set here.
          format: r.format as RoundFormat,
          estimatedDurationMinutes: Number(r.duration),
        })),
      });
      setRows(
        rounds.map((r) => ({
          key: r.id,
          id: r.id,
          name: r.name,
          format: r.format ?? '',
          duration: r.estimatedDurationMinutes?.toString() ?? '',
        })),
      );
      setMessage({ tone: 'success', text: 'Đã lưu quy trình tuyển dụng.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return <p className="text-sm text-muted-foreground">Đang tải quy trình…</p>;
  }
  if (status !== 'authenticated') {
    return (
      <p className="text-sm text-muted-foreground">
        Vui lòng đăng nhập bằng tài khoản nhà tuyển dụng.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {rows.length === 0 && (
        <Card className="text-sm text-muted-foreground">
          Chưa có vòng tuyển dụng nào. Thêm vòng đầu tiên bên dưới.
        </Card>
      )}
      <ol className="space-y-3">
        {rows.map((row, index) => {
          const err = errors[index] ?? {};
          return (
            <li key={row.key}>
              <Card className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary">Vòng {index + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="icon"
                      aria-label={`Chuyển vòng ${index + 1} lên`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="icon"
                      aria-label={`Chuyển vòng ${index + 1} xuống`}
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="icon"
                      aria-label={`Xóa vòng ${index + 1}`}
                      onClick={() => setRows((c) => c.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                  <Field label="Tên vòng" error={err.name}>
                    <input
                      className={fieldClass(err.name)}
                      value={row.name}
                      maxLength={100}
                      onChange={(e) => update(row.key, { name: e.target.value })}
                      aria-invalid={Boolean(err.name)}
                    />
                  </Field>
                  <Field label="Hình thức" error={err.format}>
                    <select
                      className={fieldClass(err.format)}
                      value={row.format}
                      onChange={(e) =>
                        update(row.key, { format: e.target.value as RoundFormat | '' })
                      }
                      aria-invalid={Boolean(err.format)}
                    >
                      <option value="">Chọn…</option>
                      {(Object.keys(FORMAT_LABELS) as RoundFormat[]).map((f) => (
                        <option key={f} value={f}>
                          {FORMAT_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Thời lượng (phút)" error={err.duration}>
                    <input
                      className={fieldClass(err.duration)}
                      inputMode="numeric"
                      value={row.duration}
                      onChange={(e) => update(row.key, { duration: e.target.value })}
                      aria-invalid={Boolean(err.duration)}
                    />
                  </Field>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="soft"
          disabled={rows.length >= MAX_ROUNDS}
          onClick={() => setRows((c) => [...c, emptyRow()])}
        >
          <Plus className="size-4" aria-hidden /> Thêm vòng
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />} Lưu quy trình
        </Button>
        {message && (
          <p
            role="status"
            className={message.tone === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-foreground">
      {label}
      {children}
      {error && <span className="block text-xs font-normal text-danger">{error}</span>}
    </label>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
