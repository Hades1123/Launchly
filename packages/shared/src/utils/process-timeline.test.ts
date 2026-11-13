import { describe, expect, it } from 'vitest';
import { buildProcessView } from './process-timeline';

const stage = (position: number, overrides: Record<string, unknown> = {}) => ({
  id: `s${position}`,
  name: `Round ${position}`,
  description: null,
  position,
  format: null,
  estimatedDurationMinutes: null,
  ...overrides,
});
const note = (position: number) => ({ id: `n${position}`, content: `Note ${position}`, position });

describe('buildProcessView', () => {
  it('keeps stored order and omits null format and duration', () => {
    const view = buildProcessView(
      [stage(2, { format: 'ONLINE', estimatedDurationMinutes: 60 }), stage(1)],
      [],
    );
    expect(view.rows.map((r) => r.name)).toEqual(['Round 1', 'Round 2']);
    expect(view.rows[0]!.meta).toEqual([]);
    expect(view.rows[1]!.meta).toEqual(['Online', '60 min']);
  });

  it('no rounds gives the empty state and hides notes even when notes exist', () => {
    const view = buildProcessView([], [note(1)]);
    expect(view.empty).toBe(true);
    expect(view.showNotes).toBe(false);
    expect(view.notes).toEqual([]);
  });

  it('notes keep their saved order', () => {
    const view = buildProcessView([stage(1)], [note(2), note(1)]);
    expect(view.empty).toBe(false);
    expect(view.showNotes).toBe(true);
    expect(view.notes.map((n) => n.content)).toEqual(['Note 1', 'Note 2']);
  });

  it('hides the notes section when there are rounds but no notes', () => {
    expect(buildProcessView([stage(1)], []).showNotes).toBe(false);
  });
});
