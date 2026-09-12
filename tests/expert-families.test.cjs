'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');

const pack = JSON.parse(fs.readFileSync('content/extra/expert-families.json', 'utf8')),
  aquariumV1 = JSON.parse(fs.readFileSync('tests/fixtures/expert-aquarium-01-v1.json', 'utf8'));
const expectedTypes = [
  'scene',
  'dossier',
  'witness',
  'nonogram',
  'lightup',
  'tents',
  'aquarium',
  'network',
  'trail',
  'binary',
  'futoshiki',
  'bridges',
];

test('provisional Expert family pack covers each remaining family with one unique puzzle', () => {
  assert.equal(pack.puzzles.length, expectedTypes.length);
  assert.deepEqual(
    pack.puzzles.map((p) => p.type),
    expectedTypes,
  );
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, pack.puzzles.length);

  for (const p of pack.puzzles) {
    assert.equal(p.difficulty, 'Expert', p.id);
    assert.equal(p.difficultyStatus, 'provisional', p.id);
    assert.match(p.difficultyEvidence, /^.{1,240}$/s, p.id);
    C.validateDefinition(p);
    const result = C.solve(p, null, 2, p.type === 'bridges' ? 100000 : 250000);
    assert.equal(result.solutions.length, 1, `${p.id} is unique`);
    assert.deepEqual(result.solutions[0], p.solution, `${p.id} matches its answer`);
  }
});

test('dossier target is reached through indirect evidence', () => {
  const dossier = pack.puzzles.find((p) => p.id === 'expert-dossier-01');
  assert.ok(dossier);
  assert.ok(
    dossier.clues.every((clue) =>
      clue.kind === 'link'
        ? clue.b !== dossier.targetItem
        : clue.cat !== 1 || clue.value !== dossier.targetItem,
    ),
    'no clue directly identifies or excludes the target object',
  );
  assert.ok(dossier.clues.some((clue) => clue.kind === 'link'));
  const solutions = C.solve(dossier, null, 2).solutions;
  assert.equal(solutions.length, 1);
  assert.equal(solutions[0].slice(dossier.size).indexOf(dossier.targetItem), 1);
});

test('Expert Aquarium corrects its tank count in a new revision only', () => {
  const aquarium = pack.puzzles.find((p) => p.id === 'expert-aquarium-01');
  assert.ok(aquarium);
  assert.equal(aquariumV1.revision, 1, 'fixture is the previously published snapshot');
  assert.equal(aquarium.revision, 2, 'copy correction creates a new published revision');
  assert.equal(new Set(aquarium.tanks).size, 7, 'layout contains seven tanks');
  assert.match(aquarium.title, /seven/i);
  assert.match(aquarium.story, /seven/i);
  assert.match(aquarium.difficultyEvidence, /seven/i);
  const changed = Object.keys({ ...aquariumV1, ...aquarium })
    .filter((key) => JSON.stringify(aquarium[key]) !== JSON.stringify(aquariumV1[key]))
    .sort();
  assert.deepEqual(changed, ['difficultyEvidence', 'revision', 'story', 'title']);
  C.validateDefinition(aquariumV1);
  C.validateDefinition(aquarium);
});

test('bridges candidate has a real loop and connectivity deduction', () => {
  const bridges = pack.puzzles.find((p) => p.id === 'expert-bridges-01');
  const graph = C.bridges.graph(bridges);
  assert.ok(graph.edges.length > bridges.islands.length - 1, 'underlying graph contains a cycle');
  assert.ok(
    C.bridges.connected(
      graph,
      graph.edges.map(() => 1),
    ),
    'underlying graph is connected',
  );
  assert.deepEqual(
    new Set(bridges.solution),
    new Set([0, 1, 2]),
    'routes use empty, single and double bridges',
  );

  const values = Array(graph.edges.length).fill(0);
  const target = bridges.islands.map((island) => island.count);
  const degreeSolutions = [];
  function enumerate(edge) {
    if (edge === values.length) {
      const totals = bridges.islands.map(() => 0);
      graph.edges.forEach(({ a, b }, index) => {
        totals[a] += values[index];
        totals[b] += values[index];
      });
      if (totals.every((total, index) => total === target[index]))
        degreeSolutions.push([...values]);
      return;
    }
    for (const value of [0, 1, 2]) {
      values[edge] = value;
      const totals = bridges.islands.map(() => 0);
      graph.edges.slice(0, edge + 1).forEach(({ a, b }, index) => {
        totals[a] += values[index];
        totals[b] += values[index];
      });
      if (totals.every((total, index) => total <= target[index])) enumerate(edge + 1);
    }
    values[edge] = 0;
  }
  enumerate(0);
  const connected = degreeSolutions.filter((solution) => C.bridges.connected(graph, solution));
  assert.ok(degreeSolutions.length > 1, 'degree constraints leave route alternatives');
  assert.equal(connected.length, 1, 'connectivity completes the unique deduction');
  assert.deepEqual(connected[0], bridges.solution);
  assert.match(
    C.bridges.deduction(bridges, C.registry.bridges.initial(bridges)).message,
    /Island A9 still needs 3 bridges.*at least 1 more must connect to A5/,
  );
});
