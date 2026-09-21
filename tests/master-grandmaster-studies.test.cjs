'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const { counters, bridgesGraph } = require('./helpers/family-studies-oracle.cjs');

const pack = JSON.parse(
  fs.readFileSync('content/extra/master-grandmaster-studies.json', 'utf8'),
);
const notes = JSON.parse(
  fs.readFileSync('content/curation/editorial/master-grandmaster-studies.json', 'utf8'),
);
const expectedTypes = [
  'nonogram',
  'binary',
  'futoshiki',
  'lightup',
  'tents',
  'aquarium',
  'network',
  'trail',
  'bridges',
];
const expectedDifficulty = {
  nonogram: 'Grandmaster',
  binary: 'Grandmaster',
  futoshiki: 'Grandmaster',
  lightup: 'Master',
  tents: 'Master',
  aquarium: 'Master',
  network: 'Master',
  trail: 'Grandmaster',
  bridges: 'Grandmaster',
};

function transforms(values, size, map = (value) => value) {
  const output = [];
  for (const reflected of [false, true]) {
    for (let turns = 0; turns < 4; turns++) {
      const next = [];
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          let sourceRow = row;
          let sourceCol = col;
          if (reflected) sourceCol = size - 1 - sourceCol;
          for (let turn = 0; turn < turns; turn++) {
            [sourceRow, sourceCol] = [size - 1 - sourceCol, sourceRow];
          }
          next.push(map(values[sourceRow * size + sourceCol]));
        }
      }
      output.push(next.join(','));
    }
  }
  return output;
}

function canonicalImage(puzzle, complement = false) {
  const candidates = transforms(puzzle.solution, puzzle.size);
  if (complement) {
    candidates.push(...transforms(puzzle.solution, puzzle.size, (value) => 1 - value));
  }
  return candidates.sort()[0];
}

function canonicalTrail(puzzle) {
  const reversed = puzzle.solution.map((value) => puzzle.size ** 2 + 1 - value);
  return [
    ...transforms(puzzle.solution, puzzle.size),
    ...transforms(reversed, puzzle.size),
  ].sort()[0];
}

function officialPuzzles() {
  const registry = JSON.parse(fs.readFileSync('content/official-packs.json', 'utf8'));
  return registry.packs
    .filter((relative) => relative !== 'extra/master-grandmaster-studies.json')
    .flatMap((relative) => JSON.parse(fs.readFileSync(`content/${relative}`, 'utf8')).puzzles);
}

function lineRuns(line) {
  const result = [];
  let count = 0;
  for (const value of [...line, 0]) {
    if (value) count++;
    else if (count) {
      result.push(count);
      count = 0;
    }
  }
  return result;
}

test('Master and Grandmaster studies cover all nine requested cabinet families', () => {
  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.id, 'alibi-master-grandmaster-studies');
  assert.deepEqual(
    pack.puzzles.map((puzzle) => puzzle.type),
    expectedTypes,
  );
  assert.equal(new Set(pack.puzzles.map((puzzle) => puzzle.id)).size, expectedTypes.length);
  assert.equal(pack.puzzles.filter((puzzle) => puzzle.difficulty === 'Master').length, 4);
  assert.equal(pack.puzzles.filter((puzzle) => puzzle.difficulty === 'Grandmaster').length, 5);

  assert.equal(notes.schemaVersion, 1);
  assert.equal(notes.packId, pack.id);
  assert.equal(notes.humanPlaytested, false);
  assert.equal(notes.studies.length, pack.puzzles.length);

  for (const puzzle of pack.puzzles) {
    assert.equal(puzzle.revision, 1, puzzle.id);
    assert.equal(puzzle.difficulty, expectedDifficulty[puzzle.type], puzzle.id);
    assert.equal(puzzle.difficultyStatus, 'provisional', puzzle.id);
    assert.match(puzzle.difficultyEvidence, /^.{20,240}$/s, puzzle.id);
    C.validateDefinition(puzzle);

    const note = notes.studies.find((candidate) => candidate.id === puzzle.id);
    assert.ok(note, `${puzzle.id} has an editorial note`);
    assert.equal(note.humanPlaytested, false, puzzle.id);
    assert.match(note.structuralDistinction, /^.{40,400}$/s, puzzle.id);
    assert.ok(Array.isArray(note.intendedReasoningPath), puzzle.id);
    assert.ok(note.intendedReasoningPath.length >= 3, puzzle.id);
    assert.ok(
      note.intendedReasoningPath.every((step) => /^.{15,240}$/s.test(step)),
      puzzle.id,
    );
  }
});

test('every study is independently unique and agrees with the native bounded solver', () => {
  for (const puzzle of pack.puzzles) {
    const independent = counters[puzzle.type](puzzle, 2);
    assert.equal(independent.count, 1, `${puzzle.id} has one independent solution`);
    assert.deepEqual(independent.first, puzzle.solution, `${puzzle.id} independent answer`);
    assert.ok(independent.nodes <= 500000, `${puzzle.id} independent search is bounded`);

    const budget = puzzle.type === 'bridges' ? 100000 : 250000;
    const native = C.solve(puzzle, null, 2, budget);
    assert.deepEqual(native.solutions, [puzzle.solution], `${puzzle.id} native answer`);
    assert.ok(native.nodes < budget, `${puzzle.id} native search is bounded`);
  }
});

test('the expansion adds genuinely new structures rather than semantic reskins', () => {
  const prior = officialPuzzles();
  const priorNonograms = new Set(
    prior
      .filter((puzzle) => puzzle.type === 'nonogram')
      .map((puzzle) => canonicalImage(puzzle)),
  );
  const priorBinary = new Set(
    prior
      .filter((puzzle) => puzzle.type === 'binary')
      .map((puzzle) => canonicalImage(puzzle, true)),
  );
  const priorTrails = new Set(
    prior.filter((puzzle) => puzzle.type === 'trail').map((puzzle) => canonicalTrail(puzzle)),
  );
  const signatures = new Set(
    prior.map((puzzle) =>
      JSON.stringify({
        type: puzzle.type,
        size: puzzle.size,
        walls: puzzle.walls,
        trees: puzzle.trees,
        tanks: puzzle.tanks,
        tiles: puzzle.tiles,
        givens: puzzle.givens,
        inequalities: puzzle.inequalities,
        islands: puzzle.islands,
      }),
    ),
  );

  for (const puzzle of pack.puzzles) {
    if (puzzle.type === 'nonogram') {
      assert.equal(priorNonograms.has(canonicalImage(puzzle)), false);
    } else if (puzzle.type === 'binary') {
      assert.equal(priorBinary.has(canonicalImage(puzzle, true)), false);
    } else if (puzzle.type === 'trail') {
      assert.equal(priorTrails.has(canonicalTrail(puzzle)), false);
    } else {
      const signature = JSON.stringify({
        type: puzzle.type,
        size: puzzle.size,
        walls: puzzle.walls,
        trees: puzzle.trees,
        tanks: puzzle.tanks,
        tiles: puzzle.tiles,
        givens: puzzle.givens,
        inequalities: puzzle.inequalities,
        islands: puzzle.islands,
      });
      assert.equal(signatures.has(signature), false, puzzle.id);
    }
  }
});

test('each family carries a concrete high-difficulty structure rather than easy filler', () => {
  const byType = Object.fromEntries(pack.puzzles.map((puzzle) => [puzzle.type, puzzle]));

  const nonogram = byType.nonogram;
  assert.equal(nonogram.size, 15);
  const filled = nonogram.solution.filter(Boolean).length;
  assert.ok(filled >= 60 && filled <= 150, 'Nonogram keeps meaningful negative space');
  assert.ok(
    [...nonogram.rowClues, ...nonogram.colClues].filter((clues) => clues.length >= 3).length >= 8,
    'Nonogram has several interlocking multi-run lines',
  );
  for (let row = 0; row < nonogram.size; row++) {
    assert.deepEqual(
      lineRuns(nonogram.solution.slice(row * nonogram.size, (row + 1) * nonogram.size)),
      nonogram.rowClues[row],
    );
  }

  const binary = byType.binary;
  assert.equal(binary.size, 8);
  assert.equal(binary.givens.filter((value) => value >= 0).length, 14, 'Binary uses fourteen sparse givens');

  const futoshiki = byType.futoshiki;
  assert.ok(futoshiki.size >= 7);
  assert.equal(futoshiki.givens.filter(Boolean).length, 6, 'Futoshiki uses six sparse givens');
  assert.ok(futoshiki.inequalities.length >= 24, 'Futoshiki carries a long inequality network');

  const lightup = byType.lightup;
  assert.equal(lightup.size, 7);
  assert.ok(lightup.walls.filter((wall) => wall === -2).length >= 30);
  assert.equal(lightup.walls.filter((wall) => wall >= 0).length, 9);

  const tents = byType.tents;
  assert.equal(tents.size, 7);
  assert.ok(tents.trees.length >= 9);
  assert.ok(tents.rowTargets.filter((value) => value > 1).length >= 2);
  assert.ok(tents.colTargets.filter((value) => value > 1).length >= 2);

  const aquarium = byType.aquarium;
  assert.equal(aquarium.size, 7);
  assert.ok(new Set(aquarium.tanks).size >= 8);
  assert.ok(aquarium.rowTargets.filter(Boolean).length >= 4);
  assert.ok(aquarium.colTargets.filter(Boolean).length >= 4);

  const network = byType.network;
  assert.equal(network.size, 7);
  assert.equal(network.locked.length, 0);
  assert.equal(new Set(network.tiles).size, 13);

  const trail = byType.trail;
  assert.equal(trail.size, 6);
  assert.equal(trail.givens.filter(Boolean).length, 6, 'Trail uses six decisive anchors');
  assert.ok(trail.givens.includes(1) && trail.givens.includes(36));

  const bridges = byType.bridges;
  assert.equal(bridges.size, 9);
  assert.equal(bridges.islands.length, 15);
  const graph = bridgesGraph(bridges);
  assert.ok(graph.edges.length > bridges.islands.length - 1, 'Bridges graph has real cycles');
  assert.ok(graph.crosses.some((crossings) => crossings.length), 'Bridges graph has crossing choices');
  assert.deepEqual(new Set(bridges.solution), new Set([0, 1, 2]));
});

test('the stacked official catalogue reaches 376 puzzles without rewriting earlier definitions', () => {
  const original = JSON.parse(fs.readFileSync('content/catalog.json', 'utf8'));
  const registry = JSON.parse(fs.readFileSync('content/official-packs.json', 'utf8'));
  assert.ok(registry.packs.includes('extra/master-grandmaster-studies.json'));
  const official = registry.packs.flatMap(
    (relative) => JSON.parse(fs.readFileSync(`content/${relative}`, 'utf8')).puzzles,
  );
  assert.equal(official.length, 376);
  assert.deepEqual(official.slice(0, original.puzzles.length), original.puzzles);
  assert.equal(new Set(official.map((puzzle) => puzzle.id)).size, official.length);
});
