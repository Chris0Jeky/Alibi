'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Afterlight supplies ten separately importable authored 15 by 15 pictures', () => {
  assert.ok(fs.existsSync('content/workshop/afterlight-pictures.json'), 'the actual optional pack must be present');
  const pack = JSON.parse(fs.readFileSync('content/workshop/afterlight-pictures.json'));
  assert.equal(pack.puzzles.length, 10);
  for (const p of pack.puzzles) {
    assert.equal(p.size, 15);
    assert.equal(p.revision, 1);
    assert.equal(p.difficultyStatus, 'provisional');
  }
});

test('blank clue lines and separated runs retain the native clue representation', () => {
  const { runs } = require('../tools/curation/afterlight-pictures.cjs');
  assert.deepEqual(runs(Array(15).fill(0)), [0]);
  assert.deepEqual(runs([0, 1, 1, 0, 1]), [2, 1]);
});

const crypto = require('node:crypto');
const { load } = require('../tools/official-catalogue.cjs');
const { counters } = require('./helpers/family-studies-oracle.cjs');
const C = globalThis.AlibiCore;
require('../src/insights.js');
const B = require('../tools/curation/afterlight-pictures.cjs');
const blueprint = require('../content/curation/editorial/afterlight-blueprints.json');
const pack = require('../content/workshop/afterlight-pictures.json');
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const prior = load(process.cwd(), false).puzzles;
const canonical = (p) => {
  const variants = [];
  for (let flip = 0; flip < 2; flip++) for (let turns = 0; turns < 4; turns++) {
    variants.push(p.solution.map((_, cell) => {
      let row = Math.floor(cell / p.size), col = cell % p.size;
      if (flip) col = p.size - col - 1;
      for (let turn = 0; turn < turns; turn++) [row, col] = [p.size - col - 1, row];
      return p.solution[row * p.size + col];
    }).join(''));
  }
  return variants.sort()[0];
};

test('the production importer accepts the whole pack and rejects corrupted answers', () => {
  assert.equal(C.validatePack(pack, true).puzzles.length, 10);
  const bad = structuredClone(pack);
  bad.puzzles[0].solution[0] ^= 1;
  assert.throws(() => C.validatePack(bad, true));
});

test('the authored blueprints reproduce every shipped byte without rewriting old content', () => {
  const before = JSON.stringify(blueprint);
  assert.deepEqual(B.build(blueprint), pack);
  assert.equal(B.serialize(pack), fs.readFileSync('content/workshop/afterlight-pictures.json', 'utf8'));
  assert.equal(JSON.stringify(blueprint), before);
  assert.equal(digest(prior.slice(0, 510)), 'a08a479cccc1f8126bc1e0361355a8389ef63ccabe3577a38513a9b1a40900ef');
  assert.ok(!require('../content/official-packs.json').packs.includes('workshop/afterlight-pictures.json'));
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, 10);
  assert.equal(new Set(pack.puzzles.map((p) => p.title)).size, 10);
  for (const p of pack.puzzles) {
    assert.equal(prior.some((old) => old.id === p.id), false);
    assert.equal(Object.hasOwn(p, 'minutes'), false);
    assert.ok(['Tricky', 'Expert'].includes(p.difficulty));
  }
});

test('malformed pixels, incomplete rows and repeated IDs are refused before compilation', () => {
  for (const mutation of [
    (b) => b.studies[0].rows.pop(),
    (b) => { b.studies[0].rows[0] = '.'.repeat(14); },
    (b) => { b.studies[0].rows[0] = 'x'.repeat(15); },
    (b) => { delete b.studies[0].rows[1]; },
    (b) => { b.studies[1].id = b.studies[0].id; },
    (b) => { b.schemaVersion = 2; },
  ]) {
    const candidate = structuredClone(blueprint);
    mutation(candidate);
    assert.throws(() => B.build(candidate));
  }
  assert.throws(() => B.runs([0, -1, 1]));
});

for (const puzzle of pack.puzzles) {
  test(`${puzzle.id}: independent and native solvers prove exactly the authored answer`, () => {
    const before = JSON.stringify(puzzle);
    const publicPuzzle = { ...puzzle };
    delete publicPuzzle.solution;
    const native = C.solveDefinition(publicPuzzle, 2, 250000);
    const independent = counters.nonogram(publicPuzzle, 2);
    assert.equal(native.solutions.length, 1);
    assert.equal(independent.count, 1);
    assert.ok(native.nodes < 250000);
    assert.ok(independent.nodes < 500000);
    assert.deepEqual(native.solutions[0], puzzle.solution);
    assert.deepEqual(independent.first, puzzle.solution);
    assert.equal(JSON.stringify(puzzle), before);
  });

  test(`${puzzle.id}: all 225 squares follow sound answer-independent production deductions`, () => {
    const publicPuzzle = new Proxy(puzzle, { get(target, key) {
      if (key === 'solution') throw Error('A deduction must not read the answer');
      return target[key];
    } });
    let state = C.registry.nonogram.initial(publicPuzzle);
    for (let step = 0; step < 225; step++) {
      const before = JSON.stringify(state);
      const hint = C.insights.deduction(publicPuzzle, state);
      assert.ok(hint && hint.cells.length === 1, `stalled at ${step}`);
      assert.equal(JSON.stringify(state), before);
      const cell = hint.cells[0];
      assert.equal(state.cells[cell], -1, 'each step resolves an unknown square');
      assert.equal(hint.value, puzzle.solution[cell]);
      state = C.registry.nonogram.reduce(publicPuzzle, state, { type: 'set', cell, value: hint.value });
      assert.notEqual(JSON.stringify(state), before, 'the production move must change state');
    }
    assert.equal(C.registry.nonogram.complete(publicPuzzle, state), true);
  });
}

test('no picture is a rotation or reflection of the official or optional collections', () => {
  const collections = [...prior];
  for (const filename of fs.readdirSync('content/workshop')) {
    if (!filename.endsWith('.json') || filename === 'afterlight-pictures.json') continue;
    const source = JSON.parse(fs.readFileSync('content/workshop/' + filename));
    collections.push(...(source.puzzles || []));
  }
  const seen = new Set(collections.filter((p) => p.type === 'nonogram' && p.size === 15).map(canonical));
  for (const p of pack.puzzles) {
    const key = canonical(p);
    assert.equal(seen.has(key), false, p.id);
    seen.add(key);
  }
});
