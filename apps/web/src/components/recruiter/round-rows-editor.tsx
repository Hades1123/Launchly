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
import { useTranslations } from 'next-intl';
import {
  MAX_ROUND_DURATION_MINUTES,
  MAX_ROUNDS,
  MIN_ROUND_DURATION_MINUTES,
  ROUND_FORMATS,
  type RoundDto,
  type RoundFormat,
} from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/** Translator for the `recruiter.rounds` namespace: `useTranslations('recruiter.rounds')`. */
export type RoundsTranslator = ReturnType<typeof useTranslations<'recruiter.rounds'>>;

export type RoundRow = {
  key: string;
  id?: string;
  name: string;
  format: RoundFormat | '';
  duration: string;
};
export type RoundRowErrors = { name?: string; format?: string; duration?: string };

/** The message shown under a round field that fails validation. */
export function roundErrorText(field: keyof RoundRowErrors, t: RoundsTranslator): string {
  if (field === 'duration') {
    return t('errors.duration', {
      min: MIN_ROUND_DURATION_MINUTES,
      max: MAX_ROUND_DURATION_MINUTES,
    });
  }
  return t(`errors.${field}`);
}

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
  const t = useTranslations('recruiter.rounds');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key });
  const n = index + 1;
  const label = t('round', { n });
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
              aria-label={t('dragHandle', { n })}
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
              aria-label={t('moveUp', { n })}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              className="p-2"
              aria-label={t('moveDown', { n })}
              disabled={last}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="size-4" aria-hidden />
            </Button>
            <Button
              variant="danger-ghost"
              className="p-2"
              aria-label={t('remove', { n })}
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label={t('fields.name')} error={error.name} className="sm:col-span-2">
            <input
              className={fieldClass(error.name)}
              value={row.name}
              maxLength={100}
              placeholder={t('fields.namePlaceholder')}
              onChange={(e) => onUpdate({ name: e.target.value })}
              aria-invalid={Boolean(error.name)}
            />
          </Field>
          <Field label={t('fields.format')} error={error.format}>
            <select
              className={fieldClass(error.format)}
              value={row.format}
              onChange={(e) => onUpdate({ format: e.target.value as RoundFormat | '' })}
              aria-invalid={Boolean(error.format)}
            >
              <option value="">{t('fields.choose')}</option>
              {ROUND_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`formats.${f}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('fields.duration')} error={error.duration}>
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

/** Common rounds a recruiter can add in one click, then adjust; names are message keys. */
const ROUND_SUGGESTIONS: {
  name: 'screening' | 'takeHome' | 'technical' | 'manager';
  format: RoundFormat;
  duration: string;
}[] = [
  { name: 'screening', format: 'ONLINE', duration: '15' },
  { name: 'takeHome', format: 'ASSIGNMENT', duration: '120' },
  { name: 'technical', format: 'ONLINE', duration: '60' },
  { name: 'manager', format: 'ONSITE', duration: '45' },
];

/** "3 rounds · about 2 hours 15 minutes" for the rounds that have a duration. */
export function roundsSummary(rows: RoundRow[], t: RoundsTranslator): string {
  if (rows.length === 0) return t('summary.none');
  const minutes = rows.reduce((sum, r) => sum + (Number.parseInt(r.duration, 10) || 0), 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time = [
    hours && t('summary.hours', { count: hours }),
    rest && t('summary.minutes', { count: rest }),
  ]
    .filter(Boolean)
    .join(' ');
  return time
    ? t('summary.withTime', { count: rows.length, time })
    : t('summary.count', { count: rows.length });
}

/** Screen-reader messages for dragging rounds, in the active language. */
function announcements(rows: RoundRow[], t: RoundsTranslator): Announcements {
  const position = (id: UniqueIdentifier | undefined) => rows.findIndex((r) => r.key === id) + 1;
  return {
    onDragStart: ({ active }) => t('announcements.dragStart', { n: position(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('announcements.dragOver', { n: position(active.id), position: position(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('announcements.dragEnd', { n: position(active.id), position: position(over.id) })
        : t('announcements.dragEndNoTarget', { n: position(active.id) }),
    onDragCancel: ({ active }) => t('announcements.dragCancel', { n: position(active.id) }),
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
  const t = useTranslations('recruiter.rounds');
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
  const suggestions = ROUND_SUGGESTIONS.map((r) => ({
    ...r,
    name: t(`suggestions.${r.name}`),
  })).filter((r) => !used.has(r.name.toLowerCase()));
  const full = rows.length >= MAX_ROUNDS;

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-6 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <ListOrdered className="size-5" aria-hidden />
          </span>
          <p className="font-semibold text-foreground">{t('empty.title')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('empty.body')}</p>
        </div>
      ) : (
        rows.length > 1 && (
          <p className="flex items-center gap-1 text-xs text-subtle-foreground">
            <GripVertical className="size-4" aria-hidden /> {t('dragHint')}
          </p>
        )
      )}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements: announcements(rows, t),
          screenReaderInstructions: { draggable: t('announcements.instructions') },
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
          <Plus className="size-4" aria-hidden /> {t('add')}
        </Button>
        {!full && suggestions.length > 0 && (
          <>
            <span className="ml-1 text-xs font-semibold text-subtle-foreground">
              {t('suggestions.label')}
            </span>
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
        {full && (
          <span className="text-xs text-subtle-foreground">{t('max', { max: MAX_ROUNDS })}</span>
        )}
      </div>
    </div>
  );
}
