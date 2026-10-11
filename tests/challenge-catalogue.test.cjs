'use strict';
// Build fail-fast pin: entries the runtime trusted registry rejects must
// throw in tools/challenge-catalogue.cjs load(), before worker embedding.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const catalogue = require('../tools/challenge-catalogue.cjs');

function fixtureRoot(challenges) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-challenge-catalogue-'));
  const dir = path.join(root, 'content', 'challenges');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'registry.json'),
    JSON.stringify({ schema: 1, packs: ['pack.json'] }),
  );
  fs.writeFileSync(
    path.join(dir, 'pack.json'),
    JSON.stringify({
      schema: 'alibi-curation-challenges/v1',
      notASchema1ImportPack: true,
      challenges,
    }),
  );
  return root;
}

function assertLoadThrows(t, challenges, pattern = /Invalid challenge source entry\./) {
  const root = fixtureRoot(challenges);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => catalogue.load(root), pattern);
}

test('junk id entry is rejected at load before worker embedding', (t) => {
  assertLoadThrows(t, [{ id: 'x' }]);
});

test('entries mirror the runtime id and revision gate', (t) => {
  // Junk ids/revisions pass the old pack envelope but must fail at load.
  for (const bad of [
    [{ id: 'bogus' }],
    [{ id: 'curated-unknown-01', revision: 1 }],
    [{ id: 'curated-classic-HANOI-01', revision: 1 }],
    [{ id: 'curated-classic-hanoi-01' }],
    [{ id: 'curated-classic-hanoi-01', revision: 0 }],
    [{ id: 'curated-classic-hanoi-01', revision: 2 }],
    [{ id: 'curated-classic-hanoi-01', revision: '1' }],
  ])
    assertLoadThrows(t, bad);
  // Null/non-object/empty-id shapes already failed at load; keep them failing.
  for (const bad of [[null], ['curated-classic-hanoi-01'], [{}], [{ id: '' }]])
    assertLoadThrows(t, bad, /Invalid challenge source (pack|entry)\./);
});

test('duplicate ids are still rejected', (t) => {
  const entry = { id: 'curated-classic-hanoi-01', revision: 1 };
  const root = fixtureRoot([entry, { ...entry }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => catalogue.load(root), /Invalid challenge source/);
});

test('valid curated entries still load', (t) => {
  const challenges = [{ id: 'curated-classic-hanoi-01', revision: 1 }];
  const root = fixtureRoot(challenges);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(catalogue.load(root), challenges);
});

test('runtime gate rejects the same junk entry', () => {
  const Challenges = require('../src/challenges.js');
  const quiet = { classicInitial: {}, classicMove: {}, classicWon: {} };
  const club = { warehouse: {}, reversi: {}, borough: {} };
  assert.throws(
    () => Challenges.create([{ id: 'x' }], { quiet, club }),
    /Invalid trusted challenge ID\./,
  );
});
