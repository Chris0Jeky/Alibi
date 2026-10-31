import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import test from 'node:test';
import { CARDS, REVISION } from '../prototypes/two-dossiers/case.mjs';
import { remaining, classify } from '../prototypes/two-dossiers/model.mjs';

const ids = ['A1', 'A2', 'B1', 'B2'];
const fields = ['upper', 'lower', 'pulse', 'quay', 'yard'];
const key = (world) => fields.map((field) => Number(world[field])).join('');

// Independent truth tables, ordered upper/lower/pulse and pulse/quay/yard.
const calibration = new Set(['000', '011', '101', '110']);
const branches = new Set(['000', '110', '101']);
const oracle = [];
for (const upper of [false, true])
  for (const lower of [false, true])
    for (const pulse of [false, true])
      for (const quay of [false, true])
        for (const yard of [false, true]) {
          const row = { upper, lower, pulse, quay, yard };
          const bits = key(row);
          oracle.push({
            row,
            facts: [
              calibration.has(bits.slice(0, 3)),
              branches.has(bits.slice(2)),
              ['01', '10'].includes(bits.slice(0, 2)),
              bits[4] === '0',
            ],
          });
        }

test('all 16 citation subsets match the independent 32-world oracle and both verdicts', () => {
  assert.equal(oracle.length, 32);
  for (let mask = 0; mask < 16; mask++) {
    const citations = ids.filter((_, i) => mask & (1 << i));
    const expected = oracle
      .filter(({ facts }) => facts.every((fact, i) => !(mask & (1 << i)) || fact))
      .map(({ row }) => row);
    const actual = remaining(citations);
    assert.deepEqual(actual.map(key).sort(), expected.map(key).sort(), citations.join(','));
    for (const claim of ['quay', 'upper']) {
      const count = expected.filter((w) => w[claim]).length;
      const verdict =
        count === 0 ? 'refuted' : count === expected.length ? 'supported' : 'uncertain';
      assert.equal(classify(actual, claim), verdict, `${citations}: ${claim}`);
    }
  }
});

test('neither role alone certifies Quay and every current premise is necessary', () => {
  for (const [citations, count] of [
    [['A1', 'A2'], 6],
    [['B1', 'B2'], 8],
  ]) {
    const worlds = remaining(citations);
    assert.equal(worlds.length, count);
    assert.equal(classify(worlds, 'quay'), 'uncertain');
    assert.equal(classify(worlds, 'upper'), 'uncertain');
  }
  for (const omitted of ids) {
    const worlds = remaining(ids.filter((id) => id !== omitted));
    assert.equal(worlds.length, 4);
    assert.equal(classify(worlds, 'quay'), 'uncertain', `missing ${omitted}`);
    assert.ok(worlds.some((w) => w.quay) && worlds.some((w) => !w.quay));
  }
});

test('joint evidence establishes Quay while preserving both shutter orientations', () => {
  const worlds = remaining(ids);
  assert.equal(worlds.length, 2);
  assert.equal(classify(worlds, 'quay'), 'supported');
  assert.equal(classify(worlds, 'upper'), 'uncertain');
  assert.deepEqual(worlds.map(key).sort(), ['01110', '10110']);
});

test('some supporting worlds never become certainty', () => {
  const worlds = remaining(['B2']);
  assert.ok(worlds.some((w) => w.quay));
  assert.equal(classify(worlds, 'quay'), 'uncertain');
  assert.equal(classify(remaining([]), 'upper'), 'uncertain');
});

test('contradictory evidence leaves zero worlds and cannot certify either claim', () => {
  const contradiction = remaining(ids).filter((w) => w.yard);
  assert.equal(contradiction.length, 0);
  for (const claim of ['quay', 'upper'])
    assert.equal(classify(contradiction, claim), 'unavailable');
});

test('superseded evidence, unknown IDs and malformed inputs are refused', () => {
  for (const citations of [
    null,
    {},
    'A1',
    ['A0'],
    ['A0', 'A2', 'B1', 'B2'],
    [...ids, 'A0'],
    ['A1', 'A1'],
    ['A3'],
    [null],
    ['__proto__'],
    Array(6).fill('A1'),
  ]) {
    assert.equal(remaining(citations), null);
    assert.equal(classify(remaining(citations), 'quay'), 'unavailable');
  }
  for (const worlds of [
    null,
    {},
    [null],
    [{}],
    [{ upper: 'true' }],
    Array(33).fill(remaining([])[0]),
  ]) {
    assert.equal(classify(worlds, 'quay'), 'unavailable');
  }
  assert.equal(classify(remaining(ids), 'unknown'), 'unavailable');
  assert.equal(classify(remaining(ids), '__proto__'), 'unavailable');
});

test('one versioned five-card case supplies both roles and the same combined source', () => {
  assert.equal(REVISION, 'shared-signal-1');
  assert.deepEqual(
    CARDS.map((card) => card.id),
    ['A0', ...ids],
  );
  assert.equal(new Set(CARDS.map((card) => card.id)).size, 5);
  assert.equal(CARDS.filter((card) => card.role === 'archive').length, 3);
  assert.equal(CARDS.filter((card) => card.role === 'field').length, 2);
  assert.deepEqual(
    CARDS.filter((card) => card.current).map((card) => card.id),
    ids,
  );
  const dir = new URL('../prototypes/two-dossiers/', import.meta.url);
  const bytes = readdirSync(dir).reduce(
    (total, name) => total + statSync(new URL(name, dir)).size,
    0,
  );
  assert.ok(bytes <= 72 * 1024, `${bytes} authored bytes exceeds the 72 KiB scope`);
});
