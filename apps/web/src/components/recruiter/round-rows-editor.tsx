'use client';

import { useId, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, ListOrdered, Plus, Trash2 } from 'lucide-react';
import {
  MAX_ROUND_DURATION_MINUTES,
  MAX_ROUNDS,
  MIN_ROUND_DURATION_MINUTES,
  type RoundDto,
  type RoundFormat,
} from '@launchly/shared';
import { Button } from '@/components/ui/button';
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

type RoundItemProps = {
  row: RoundRow;
  index: number;
  count: number;
  error: RoundRowErrors;
  onUpdate: (patch: Partial<RoundRow>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

function SortableRound({ row, index, count, error, onUpdate, onMove, onRemove }: RoundItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key });
  const label = `Vòng ${index + 1}`;
  const last = index === count - 1;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative flex gap-3', isDragging && 'z-10')}
    >
      {/* Timeline rail: the round number, joined to the next round by a line. */}
      <div className="flex flex-col items-center" aria-hidden>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            isDragging ? 'bg-primary text-primary-foreground' : 'bg-primary-subtle text-primary',
          )}
        >
          {index + 1}
        </span>
        {!last && <span className="mt-2 w-0.5 flex-1 rounded-full bg-border" />}
      </div>
      <div
        className={cn(
          'mb-4 min-w-0 flex-1 space-y-3 rounded-card border border-border bg-surface p-4 transition-shadow',
          isDragging && 'shadow-card-hover ring-2 ring-primary',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Kéo để sắp xếp ${label.toLowerCase()}`}
              className={cn(
                '-ml-2 cursor-grab touch-none rounded-control p-1.5 text-subtle-foreground hover:bg-surface-muted hover:text-foreground',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing',
              )}
            >
              <GripVertical className="size-5" aria-hidden />
            </button>
            <span className="truncate text-sm font-semibold text-foreground">
              {row.name.trim() || <span className="text-subtle-foreground">{label}</span>}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              className="p-2"
              aria-label={`Chuyển vòng ${index + 1} lên`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              className="p-2"
              aria-label={`Chuyển vòng ${index + 1} xuống`}
              disabled={last}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="size-4" aria-hidden />
            </Button>
            <Button
              variant="danger-ghost"
              className="p-2"
              aria-label={`Xóa vòng ${index + 1}`}
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Tên vòng" error={error.name} className="sm:col-span-2">
            <input
              className={fieldClass(error.name)}
              value={row.name}
              maxLength={100}
              placeholder="Ví dụ: Phỏng vấn kỹ thuật"
              onChange={(e) => onUpdate({ name: e.target.value })}
              aria-invalid={Boolean(error.name)}
            />
          </Field>
          <Field label="Hình thức" error={error.format}>
            <select
              className={fieldClass(error.format)}
              value={row.format}
              onChange={(e) => onUpdate({ format: e.target.value as RoundFormat | '' })}
              aria-invalid={Boolean(error.format)}
            >
              <option value="">Chọn…</option>
              {(Object.keys(ROUND_FORMAT_OPTIONS) as RoundFormat[]).map((f) => (
                <option key={f} value={f}>
                  {ROUND_FORMAT_OPTIONS[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Thời lượng (phút)" error={error.duration}>
            <input
              className={fieldClass(error.duration)}
              inputMode="numeric"
              placeholder="45"
              value={row.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              aria-invalid={Boolean(error.duration)}
            />
          </Field>
        </div>
      </div>
    </li>
  );
}

/** Common rounds a recruiter can add in one click, then adjust. */
const ROUND_SUGGESTIONS: { name: string; format: RoundFormat; duration: string }[] = [
  { name: 'Sàng lọc hồ sơ', format: 'ONLINE', duration: '15' },
  { name: 'Bài tập về nhà', format: 'ASSIGNMENT', duration: '120' },
  { name: 'Phỏng vấn kỹ thuật', format: 'ONLINE', duration: '60' },
  { name: 'Phỏng vấn với quản lý', format: 'ONSITE', duration: '45' },
];

/** "3 vòng · khoảng 2 giờ 15 phút" for the rounds that have a duration. */
export function roundsSummary(rows: RoundRow[]): string {
  if (rows.length === 0) return 'Chưa có vòng nào';
  const minutes = rows.reduce((sum, r) => sum + (Number.parseInt(r.duration, 10) || 0), 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time = [hours && `${hours} giờ`, rest && `${rest} phút`].filter(Boolean).join(' ');
  return time ? `${rows.length} vòng · khoảng ${time}` : `${rows.length} vòng`;
}

/** Screen-reader messages for dragging rounds, in Vietnamese. */
function announcements(rows: RoundRow[]): Announcements {
  const position = (id: UniqueIdentifier | undefined) => rows.findIndex((r) => r.key === id) + 1;
  return {
    onDragStart: ({ active }) => `Đã nhấc vòng ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `Vòng ${position(active.id)} đang ở vị trí ${position(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Đã thả vòng ${position(active.id)} vào vị trí ${position(over.id)}.`
        : `Đã thả vòng ${position(active.id)}.`,
    onDragCancel: ({ active }) => `Đã hủy kéo vòng ${position(active.id)}.`,
  };
}

/**
 * Ordered list of hiring rounds: add, edit, delete, and reorder by dragging the handle (mouse,
 * touch or keyboard: Space, arrows, Space) or with the up/down buttons. The parent owns the state.
 */
export function RoundRowsEditor({
  rows,
  errors,
  onChange,
}: {
  rows: RoundRow[];
  errors: RoundRowErrors[];
  onChange: (rows: RoundRow[]) => void;
}) {
  // A stable id keeps dnd-kit's aria attributes identical on the server and the client.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(key: string, patch: Partial<RoundRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    onChange(arrayMove(rows, index, target));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.key === active.id);
    const to = rows.findIndex((r) => r.key === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(rows, from, to));
  }

  const used = new Set(rows.map((r) => r.name.trim().toLowerCase()));
  const suggestions = ROUND_SUGGESTIONS.filter((r) => !used.has(r.name.toLowerCase()));
  const full = rows.length >= MAX_ROUNDS;

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-6 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <ListOrdered className="size-5" aria-hidden />
          </span>
          <p className="font-semibold text-foreground">Chưa có vòng tuyển dụng nào</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Thêm từng vòng theo thứ tự ứng viên sẽ trải qua, hoặc chọn nhanh một gợi ý bên dưới.
          </p>
        </div>
      ) : (
        rows.length > 1 && (
          <p className="flex items-center gap-1 text-xs text-subtle-foreground">
            <GripVertical className="size-4" aria-hidden /> Kéo biểu tượng này để đổi thứ tự các
            vòng.
          </p>
        )
      )}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements: announcements(rows),
          screenReaderInstructions: {
            draggable:
              'Nhấn Space để nhấc vòng, dùng phím mũi tên lên hoặc xuống để di chuyển, nhấn Space để thả hoặc Esc để hủy.',
          },
        }}
      >
        <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
          <ol>
            {rows.map((row, index) => (
              <SortableRound
                key={row.key}
                row={row}
                index={index}
                count={rows.length}
                error={errors[index] ?? {}}
                onUpdate={(patch) => update(row.key, patch)}
                onMove={(delta) => move(index, delta)}
                onRemove={() => onChange(rows.filter((r) => r.key !== row.key))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" disabled={full} onClick={() => onChange([...rows, emptyRoundRow()])}>
          <Plus className="size-4" aria-hidden /> Thêm vòng
        </Button>
        {!full && suggestions.length > 0 && (
          <>
            <span className="ml-1 text-xs font-semibold text-subtle-foreground">Gợi ý:</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => onChange([...rows, { ...emptyRoundRow(), ...suggestion }])}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors',
                  'hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                )}
              >
                <Plus className="size-3" aria-hidden /> {suggestion.name}
              </button>
            ))}
          </>
        )}
        {full && <span className="text-xs text-subtle-foreground">Tối đa {MAX_ROUNDS} vòng.</span>}
      </div>
    </div>
  );
}
