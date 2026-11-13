'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  MAX_ROUND_DURATION_MINUTES,
  MAX_ROUNDS,
  MIN_ROUND_DURATION_MINUTES,
  type RoundDto,
  type RoundFormat,
} from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export const ROUND_FORMAT_OPTIONS: Record<RoundFormat, string> = {
  ONLINE: 'Trực tuyến',
  ONSITE: 'Tại văn phòng',
  PHONE: 'Điện thoại',
  ASSIGNMENT: 'Bài tập',
};

export type RoundRow = {
  key: string;
  id?: string;
  name: string;
  format: RoundFormat | '';
  duration: string;
};
export type RoundRowErrors = { name?: string; format?: string; duration?: string };

export const ROUND_ERROR_TEXT = {
  name: 'Tên vòng là bắt buộc.',
  format: 'Hãy chọn hình thức.',
  duration: `Nhập số phút từ ${MIN_ROUND_DURATION_MINUTES} đến ${MAX_ROUND_DURATION_MINUTES}.`,
} as const;

export const emptyRoundRow = (): RoundRow => ({
  key: crypto.randomUUID(),
  name: '',
  format: '',
  duration: '',
});

export function roundRowsFrom(rounds: RoundDto[]): RoundRow[] {
  return rounds.map((r) => ({
    key: r.id,
    id: r.id,
    name: r.name,
    format: r.format ?? '',
    duration: r.estimatedDurationMinutes?.toString() ?? '',
  }));
}

export const fieldClass = (error?: string) =>
  cn(
    'min-h-11 w-full rounded-control border bg-surface px-3 text-sm text-foreground outline-none transition',
    'focus:border-primary focus:ring-2 focus:ring-ring/20',
    error ? 'border-danger' : 'border-input',
  );

export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('block space-y-1.5 text-sm font-semibold text-foreground', className)}>
      {label}
      {children}
      {hint && !error && (
        <span className="block text-xs font-normal text-subtle-foreground">{hint}</span>
      )}
      {error && <span className="block text-xs font-normal text-danger">{error}</span>}
    </label>
  );
}

/** Ordered list of hiring rounds: add, edit, move up/down and delete. The parent owns the state. */
export function RoundRowsEditor({
  rows,
  errors,
  onChange,
}: {
  rows: RoundRow[];
  errors: RoundRowErrors[];
  onChange: (rows: RoundRow[]) => void;
}) {
  function update(key: string, patch: Partial<RoundRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
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
                      onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Tên vòng" error={err.name} className="sm:col-span-2">
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
                      {(Object.keys(ROUND_FORMAT_OPTIONS) as RoundFormat[]).map((f) => (
                        <option key={f} value={f}>
                          {ROUND_FORMAT_OPTIONS[f]}
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
      <Button
        variant="soft"
        disabled={rows.length >= MAX_ROUNDS}
        onClick={() => onChange([...rows, emptyRoundRow()])}
      >
        <Plus className="size-4" aria-hidden /> Thêm vòng
      </Button>
    </div>
  );
}
