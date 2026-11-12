#!/usr/bin/env node
/* global process, console */
// Spreads ticket keys over people at random, keeping per-person counts within 1 of each other.
// Usage: node assign.mjs '<keys JSON array>' '<people JSON array of {accountId, displayName}>'
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function shuffle(items, rng) {
  const a = [...items];
  for (let i = 0; i < a.length - 1; i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assignBalanced(keys, people, rng = Math.random) {
  if (!people || people.length === 0) throw new Error('no people to assign');
  const order = shuffle(people, rng);
  return keys.map((key, i) => {
    const p = order[i % order.length];
    return { key, accountId: p.accountId, displayName: p.displayName };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [keys, people] = process.argv.slice(2).map((a) => JSON.parse(a));
    if (!Array.isArray(keys) || !Array.isArray(people)) {
      throw new Error("Usage: node assign.mjs '<keys JSON array>' '<people JSON array>'");
    }
    console.log(JSON.stringify(assignBalanced(keys, people), null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
