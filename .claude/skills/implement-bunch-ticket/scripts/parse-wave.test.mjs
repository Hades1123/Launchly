import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWave } from './parse-wave.mjs';

const md = `# Plan

## Wave 0 — In flight

| Key | Ticket | Area | Label | Pts | Depends on |
| --- | --- | --- | --- | --- | --- |
| SCRUM-26 | Post a job | api, web | feature | — | — |

## Wave 1 — Foundations

Some intro text.

| Key | Ticket | Area | Label | Pts | Depends on |
| --- | --- | --- | --- | --- | --- |
| SCRUM-46 | Set up Playwright | web | maintenance | 3 | — |
| SCRUM-51 | Round format | api, web | feature | 2 | SCRUM-41 (rounds), SCRUM-29 |

## Wave 2 - Core

| Key | Ticket | Area | Label | Pts | Depends on |
| --- | --- | --- | --- | --- | --- |
| SCRUM-53 | Job detail page | web | feature | 3 | - |

## Dependency graph

text
`;

test('parses wave by "Wave 1"', () => {
  const w = parseWave(md, 'Wave 1');
  assert.equal(w.number, 1);
  assert.equal(w.title, 'Foundations');
  assert.deepEqual(
    w.tickets.map((t) => t.key),
    ['SCRUM-46', 'SCRUM-51'],
  );
});

test('accepts "1" and "wave 1"', () => {
  const expected = parseWave(md, 'Wave 1');
  assert.deepEqual(parseWave(md, '1'), expected);
  assert.deepEqual(parseWave(md, 'wave 1'), expected);
});

test('accepts hyphen and en dash headings', () => {
  assert.equal(parseWave(md, 'Wave 2').title, 'Core');
  const en = md.replace('## Wave 2 - Core', '## Wave 2 – Core');
  assert.equal(parseWave(en, 'Wave 2').title, 'Core');
});

test('splits areas and depends', () => {
  const t = parseWave(md, 'Wave 1').tickets[1];
  assert.equal(t.title, 'Round format');
  assert.deepEqual(t.areas, ['api', 'web']);
  assert.deepEqual(t.dependsOn, ['SCRUM-41', 'SCRUM-29']);
  assert.equal(t.points, 2);
  assert.equal(t.label, 'feature');
});

test('empty depends is []', () => {
  assert.deepEqual(parseWave(md, 'Wave 1').tickets[0].dependsOn, []);
  assert.deepEqual(parseWave(md, 'Wave 2').tickets[0].dependsOn, []);
});

test('unknown wave lists available', () => {
  assert.throws(() => parseWave(md, 'Wave 9'), /Wave 9 not found.*Wave 0, Wave 1, Wave 2/);
});

test('duplicate wave throws', () => {
  const dup = md + '\n## Wave 1 — Again\n';
  assert.throws(() => parseWave(dup, 'Wave 1'), /duplicate.*Wave 1/i);
});

test('missing column throws', () => {
  const noDeps = `## Wave 1 — X

| Key | Ticket | Area | Label | Pts |
| --- | --- | --- | --- | --- |
| SCRUM-46 | A | web | feature | 3 |
`;
  assert.throws(() => parseWave(noDeps, 'Wave 1'), /missing column.*Depends on/i);
});

test('points "—" is null', () => {
  assert.equal(parseWave(md, 'Wave 0').tickets[0].points, null);
});
