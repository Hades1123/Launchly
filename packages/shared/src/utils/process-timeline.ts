import { roundMeta } from '../constants/job-round-format';
import type { RoundFormat } from '../schemas/job-round';

type StageInput = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  format: RoundFormat | null;
  estimatedDurationMinutes: number | null;
};
type NoteInput = { id: string; content: string; position: number };

export type TimelineRow = {
  id: string;
  name: string;
  description: string | null;
  /** English text pieces; the web app translates `format` and `durationMinutes` instead. */
  meta: string[];
  format: RoundFormat | null;
  durationMinutes: number | null;
};

export type ProcessView = {
  rows: TimelineRow[];
  /** True when the company gave no rounds: show "Company has not provided the process". */
  empty: boolean;
  /** Notes are shown only when there is a process and at least one note. */
  showNotes: boolean;
  notes: { id: string; content: string }[];
};

/** View model for the hiring process timeline and the company notes of a public job. */
export function buildProcessView(stages: StageInput[], notes: NoteInput[]): ProcessView {
  const rows = [...stages]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      meta: roundMeta(s),
      format: s.format,
      durationMinutes: s.estimatedDurationMinutes,
    }));
  const empty = rows.length === 0;
  const orderedNotes = [...notes]
    .sort((a, b) => a.position - b.position)
    .map((n) => ({ id: n.id, content: n.content }));
  const showNotes = !empty && orderedNotes.length > 0;
  return { rows, empty, showNotes, notes: showNotes ? orderedNotes : [] };
}
