import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignBalanced } from './assign.mjs';

const people = (n) =>
  Array.from({ length: n }, (_, i) => ({ accountId: `acc-${i}`, displayName: `Person ${i}` }));
const keys = (n) => Array.from({ length: n }, (_, i) => `SCRUM-${46 + i}`);
const cycling = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const counts = (result) => {
  const c = {};
  for (const r of result) c[r.accountId] = (c[r.accountId] || 0) + 1;
  return Object.values(c).sort();
};

test('every key assigned once', () => {
  const result = assignBalanced(keys(6), people(4));
  assert.equal(result.length, 6);
  assert.deepEqual(
    result.map((r) => r.key),
    keys(6),
  );
});

test('balanced', () => {
  assert.deepEqual(counts(assignBalanced(keys(6), people(4))), [1, 1, 2, 2]);
});

test('fewer keys than people', () => {
  const result = assignBalanced(keys(2), people(5));
  assert.notEqual(result[0].accountId, result[1].accountId);
});

test('single person', () => {
  const result = assignBalanced(keys(3), people(1));
  assert.ok(result.every((r) => r.accountId === 'acc-0' && r.displayName === 'Person 0'));
});

test('deterministic with seeded rng', () => {
  const seq = [0.1, 0.7, 0.3, 0.9];
  assert.deepEqual(
    assignBalanced(keys(6), people(4), cycling(seq)),
    assignBalanced(keys(6), people(4), cycling(seq)),
  );
});

test('not always first person', () => {
  const result = assignBalanced(keys(1), people(4), () => 0.99);
  assert.notEqual(result[0].accountId, 'acc-0');
});

test('empty people throws', () => {
  assert.throws(() => assignBalanced(keys(2), []), /no people to assign/);
});
