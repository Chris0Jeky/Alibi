'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'content/workshop/lattice-studies.json');
const evidence = () => require('../tools/curation/lattice-evidence.cjs');
const withoutAnswer = (p) =>
  new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw Error('An opening read the answer');
      return target[key];
    },
  });

test('Lattice contains twenty-four optional studies, not silent startup growth', () => {
  assert.ok(fs.existsSync(source), 'Workshop collection exists');
  const pack = JSON.parse(fs.readFileSync(source));
  assert.equal(pack.puzzles.length, 24);
  for (const type of ['futoshiki', 'lightup'])
    assert.equal(pack.puzzles.filter((p) => p.type === type).length, 12);
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, 24);
  assert.equal(new Set(pack.puzzles.map((p) => p.title)).size, 24);
  assert.ok(
    !require('../content/official-packs.json').packs.includes('workshop/lattice-studies.json'),
  );
  for (const p of pack.puzzles) {
    assert.equal(p.revision, 1);
    assert.equal(p.difficultyStatus, 'provisional');
    assert.ok(['Expert', 'Master'].includes(p.difficulty));
    assert.equal(Object.hasOwn(p, 'minutes'), false);
  }
});

test('a turning inequality chain gives sound endpoint ranges without the answer', () => {
  const p = {
    type: 'futoshiki',
    size: 4,
    inequalities: [
      { a: 0, b: 1, op: '<' },
      { a: 1, b: 5, op: '<' },
    ],
  };
  assert.deepEqual(evidence().opening(withoutAnswer(p)), {
    kind: 'inequality-chain',
    cells: [0, 1, 5],
    startRange: [1, 2],
    endRange: [3, 4],
    crossAxis: true,
  });
});

test('contradictory or unsupported opening graphs are not presented as deductions', () => {
  const p = {
    type: 'futoshiki',
    size: 4,
    inequalities: [
      { a: 0, b: 1, op: '<' },
      { a: 1, b: 0, op: '<' },
    ],
  };
  assert.throws(() => evidence().opening(p), /cycle/i);
  assert.throws(() => evidence().opening({ type: 'sudoku' }), /unsupported/i);
});

test('every study reproduces its seed, final certificate and visible opening', () => {
  assert.ok(fs.existsSync(source), 'Workshop collection exists');
  const pack = JSON.parse(fs.readFileSync(source));
  const notes = require('../content/curation/editorial/lattice-studies.json');
  const R = require('../tools/curation/night-recipes.cjs');
  assert.equal(notes.studies.length, 24);
  assert.equal(notes.humanPlaytested, false);
  const metadata = new Set([
    'id',
    'title',
    'subtitle',
    'difficulty',
    'difficultyStatus',
    'story',
    'difficultyEvidence',
  ]);
  for (const p of pack.puzzles) {
    const note = notes.studies.find((n) => n.id === p.id);
    assert.ok(note, p.id);
    assert.deepEqual(evidence().record(p, note.seed), note, p.id);
    assert.deepEqual(evidence().opening(withoutAnswer(p)), note.opening);
    assert.equal(evidence().eligible(p), true, p.id);
    const original = R.candidate(p.type, note.seed);
    assert.ok(original, p.id);
    for (const [key, value] of Object.entries(original))
      if (!metadata.has(key)) assert.deepEqual(p[key], value, `${p.id} ${key}`);
  }
});

test('Lattice rejects structural copies of every existing compatible official study', () => {
  assert.ok(fs.existsSync(source), 'Workshop collection exists');
  const Q = require('../tools/curation/study-quality.cjs');
  const prior = require('../tools/official-catalogue.cjs').load(root, false).puzzles;
  const seen = new Set(
    prior.filter((p) => ['lightup', 'futoshiki'].includes(p.type)).map(Q.structuralKey),
  );
  for (const p of JSON.parse(fs.readFileSync(source)).puzzles) {
    const key = Q.structuralKey(p);
    assert.equal(seen.has(key), false, p.id);
    seen.add(key);
  }
});

test('the complete optional pack passes the production import validation boundary', () => {
  assert.ok(fs.existsSync(source), 'Workshop collection exists');
  require('../src/core.js');
  require('../src/engines.js');
  const C = require('../src/bridges.js');
  const pack = JSON.parse(fs.readFileSync(source));
  const validated = C.validatePack(pack, true);
  assert.equal(validated.puzzles.length, 24);
  const bad = structuredClone(pack);
  bad.puzzles[0].solution[0] = 99;
  assert.throws(() => C.validatePack(bad, true));
});
