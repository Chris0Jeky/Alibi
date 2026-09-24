'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { load } = require('../tools/official-catalogue.cjs');
const { counters } = require('./helpers/family-studies-oracle.cjs');
const C = globalThis.AlibiCore;
require('../src/insights.js');

const file = 'content/extra/keepers-picture-studies.json';
function collection() {
  assert.ok(fs.existsSync(file), 'six new Picture Logic studies must be shipped');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function canonical(puzzle) {
  const variants = [];
  for (let reflect = 0; reflect < 2; reflect++) {
    for (let turn = 0; turn < 4; turn++) {
      variants.push(
        puzzle.solution
          .map((_, i) => {
            let row = Math.floor(i / puzzle.size),
              col = i % puzzle.size;
            if (reflect) col = puzzle.size - col - 1;
            for (let t = 0; t < turn; t++) [row, col] = [puzzle.size - col - 1, row];
            return puzzle.solution[row * puzzle.size + col];
          })
          .join(''),
      );
    }
  }
  return variants.sort()[0];
}

test('six original revision-one studies extend the trusted catalogue without easy filler', () => {
  const pack = collection();
  assert.equal(pack.puzzles.length, 6);
  assert.equal(C.validatePack(pack, true).puzzles.length, 6);
  const catalogue = load(process.cwd(), false);
  for (const puzzle of pack.puzzles) {
    assert.equal(puzzle.type, 'nonogram');
    assert.equal(puzzle.size, 15);
    assert.equal(puzzle.revision, 1);
    assert.equal(puzzle.difficultyStatus, 'provisional');
    assert.ok(['Tricky', 'Expert'].includes(puzzle.difficulty));
    assert.deepEqual(catalogue.puzzles.find((p) => p.id === puzzle.id), puzzle);
  }
});

test('new pictures are not reflected or rotated copies of any official board', () => {
  const pack = collection();
  const others = load(process.cwd(), false).puzzles.filter((p) => p.type === 'nonogram');
  for (const puzzle of pack.puzzles) {
    for (const other of others) {
      if (other.id !== puzzle.id && other.size === puzzle.size) {
        assert.notEqual(canonical(puzzle), canonical(other), `${puzzle.id} vs ${other.id}`);
      }
    }
  }
});

test('independent and native solvers agree on exactly one answer for each picture', () => {
  for (const puzzle of collection().puzzles) {
    const before = JSON.stringify(puzzle);
    const answerless = { ...puzzle };
    delete answerless.solution;
    const proof = counters.nonogram(answerless, 2);
    assert.equal(proof.count, 1, puzzle.id);
    assert.deepEqual(proof.first, puzzle.solution, puzzle.id);
    const solved = C.solveDefinition(answerless, 2, 250000);
    assert.equal(solved.solutions.length, 1, puzzle.id);
    assert.deepEqual(solved.solutions[0], puzzle.solution, puzzle.id);
    assert.ok(solved.nodes < 250000, puzzle.id);
    assert.ok(proof.nodes <= 500000, puzzle.id);
    assert.equal(JSON.stringify(puzzle), before);
  }
});

test('every study has an answer-independent solve route through production moves', () => {
  for (const puzzle of collection().puzzles) {
    const publicPuzzle = new Proxy(puzzle, {
      get(target, key) {
        if (key === 'solution') throw Error('A hint must not read the answer');
        return target[key];
      },
    });
    let state = C.registry.nonogram.initial(publicPuzzle);
    let steps = 0;
    while (state.cells.includes(-1) && steps < 225) {
      const before = JSON.stringify(state);
      const hint = C.insights.deduction(publicPuzzle, state);
      assert.ok(hint && hint.cells.length === 1, `${puzzle.id} stalled at step ${steps}`);
      assert.equal(JSON.stringify(state), before, 'asking does not mark the board');
      const cell = hint.cells[0];
      assert.equal(hint.value, puzzle.solution[cell]);
      state = C.registry.nonogram.reduce(publicPuzzle, state, {
        type: 'set',
        cell,
        value: hint.value,
      });
      steps++;
    }
    assert.ok(C.registry.nonogram.complete(publicPuzzle, state), puzzle.id);
    assert.equal(steps, 225, 'every unknown square is accounted for');
  }
});

test('all 376 earlier puzzle definitions retain their exact canonical source payload', () => {
  const ids = new Set(collection().puzzles.map((puzzle) => puzzle.id));
  const prior = load(process.cwd(), false).puzzles.filter((puzzle) => !ids.has(puzzle.id));
  assert.equal(prior.length, 376);
  const hash = crypto.createHash('sha256').update(JSON.stringify(prior)).digest('hex');
  assert.equal(hash, 'c9c59049c3573c990df965ec27400d3acd36de17be1a6da77785333f46721b14');
});
