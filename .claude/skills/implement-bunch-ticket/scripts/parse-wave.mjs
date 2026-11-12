#!/usr/bin/env node
/* global process, console */
// Reads one wave out of a wave-plan markdown file (see docs/plans/mvp-wave-plan.md).
// Usage: node parse-wave.mjs <file> "<Wave n>"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const HEADING = /^##\s+Wave\s+(\d+)\s*[—–-]\s*(.+?)\s*$/gm;
const COLUMNS = ['Key', 'Ticket', 'Area', 'Label', 'Pts', 'Depends on'];
const KEY = /SCRUM-\d+/g;
const EMPTY = new Set(['', '—', '–', '-']);

function waveNumber(waveName) {
  const n = Number.parseInt(
    String(waveName)
      .trim()
      .replace(/^wave\s*/i, ''),
    10,
  );
  if (Number.isNaN(n)) throw new Error(`Cannot read a wave number from "${waveName}"`);
  return n;
}

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function firstTable(section) {
  const lines = section.split('\n');
  const start = lines.findIndex((l) => l.trim().startsWith('|'));
  if (start === -1) return [];
  const rows = [];
  for (let i = start; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(lines[i]);
  return rows;
}

export function parseWave(markdown, waveName) {
  const wanted = waveNumber(waveName);
  const headings = [...markdown.matchAll(HEADING)].map((m) => ({
    number: Number(m[1]),
    title: m[2],
    index: m.index,
    end: m.index + m[0].length,
  }));

  const matches = headings.filter((h) => h.number === wanted);
  if (matches.length > 1) throw new Error(`Duplicate heading for Wave ${wanted}`);
  if (matches.length === 0) {
    const available = headings.map((h) => `Wave ${h.number}`).join(', ');
    throw new Error(`Wave ${wanted} not found. Available: ${available || 'none'}`);
  }

  const heading = matches[0];
  const rest = markdown.slice(heading.end);
  const next = rest.search(/^## /m);
  const section = next === -1 ? rest : rest.slice(0, next);

  const [headerLine, , ...rowLines] = firstTable(section);
  if (!headerLine) throw new Error(`Wave ${wanted} has no ticket table`);
  const header = cells(headerLine);
  const col = {};
  for (const name of COLUMNS) {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Wave ${wanted}: missing column "${name}"`);
    col[name] = i;
  }

  const tickets = rowLines.map((line) => {
    const c = cells(line);
    const key = (c[col.Key].match(KEY) || [])[0];
    if (!key) throw new Error(`Wave ${wanted}: row without a SCRUM key: ${line.trim()}`);
    const area = c[col.Area];
    const pts = Number.parseInt(c[col.Pts], 10);
    return {
      key,
      title: c[col.Ticket],
      areas: EMPTY.has(area)
        ? []
        : area
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
      label: c[col.Label],
      points: Number.isNaN(pts) ? null : pts,
      dependsOn: c[col['Depends on']].match(KEY) || [],
    };
  });

  return { number: heading.number, title: heading.title, tickets };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, wave] = process.argv.slice(2);
  try {
    if (!file || !wave) throw new Error('Usage: node parse-wave.mjs <file> "<Wave n>"');
    console.log(JSON.stringify(parseWave(readFileSync(file, 'utf8'), wave), null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
