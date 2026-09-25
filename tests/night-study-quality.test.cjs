'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const helper = '../tools/curation/study-quality.cjs';
const samplePath = 'content/extra/master-grandmaster-studies.json';
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8')).puzzles;

function quality() {
  assert.ok(fs.existsSync(path.join(__dirname, helper)), 'authoring quality tool exists');
  return require(helper);
}

test('study quality tools supply explicit topology and definition identities', () => {
  const { structuralKey, definitionHash } = quality();
  for (const puzzle of sample) {
    assert.match(structuralKey(puzzle), new RegExp(`^${puzzle.type}:${puzzle.size}:`));
    assert.match(definitionHash(puzzle), /^[a-f0-9]{64}$/);
    const changed = { ...puzzle, title: puzzle.title + ' changed' };
    assert.notEqual(definitionHash(changed), definitionHash(puzzle));
  }
});

test('binary complements and trail reversal are not fresh content', () => {
  const { structuralKey } = quality();
  const binary = sample.find((p) => p.type === 'binary');
  const trail = sample.find((p) => p.type === 'trail');
  const complemented = { ...binary, solution: binary.solution.map((v) => 1 - v) };
  const reversed = trail.solution.map((v) => trail.size ** 2 + 1 - v);
  assert.equal(structuralKey(binary), structuralKey(complemented));
  assert.equal(structuralKey(trail), structuralKey({ ...trail, solution: reversed }));
});

test('tank numbering and starting tile rotation cannot evade topology checks', () => {
  const { structuralKey } = quality();
  const aquarium = sample.find((p) => p.type === 'aquarium');
  const network = sample.find((p) => p.type === 'network');
  const tanks = aquarium.tanks.map((v) => 20 - v);
  const tiles = network.tiles.map((v) => ((v << 1) & 15) | (v >> 3));
  assert.equal(structuralKey(aquarium), structuralKey({ ...aquarium, tanks }));
  assert.equal(structuralKey(network), structuralKey({ ...network, tiles }));
});

test('certificates bind the exact definition and replay every existing study family', () => {
  const { certify, definitionHash } = quality();
  for (const puzzle of sample) {
    const proof = certify(puzzle);
    assert.equal(proof.definitionSha256, definitionHash(puzzle));
    assert.equal(proof.semanticSolutions, 1);
    assert.ok(proof.replayActions > 0);
    assert.equal(proof.metrics.size, puzzle.size);
  }
});

test('wrong stored answers are rejected rather than certified', () => {
  const { certify } = quality();
  const puzzle = structuredClone(sample.find((p) => p.type === 'binary'));
  puzzle.solution[0] = 1 - puzzle.solution[0];
  assert.throws(() => certify(puzzle));
});

test('every supported family rejects reflected topology copies', () => {
  const { structuralKey, transforms } = quality();
  for (const puzzle of sample) {
    const reflected = structuredClone(puzzle);
    const flip = (values) => transforms(values, puzzle.size)[4];
    const cell = (index) => {
      const row = Math.floor(index / puzzle.size);
      return row * puzzle.size + puzzle.size - 1 - (index % puzzle.size);
    };
    if (['nonogram', 'binary', 'futoshiki', 'trail'].includes(puzzle.type))
      reflected.solution = flip(puzzle.solution);
    if (puzzle.type === 'lightup') reflected.walls = flip(puzzle.walls);
    if (puzzle.type === 'tents') reflected.trees = puzzle.trees.map(cell);
    if (puzzle.type === 'aquarium') reflected.tanks = flip(puzzle.tanks);
    if (puzzle.type === 'network') reflected.tiles = flip(puzzle.tiles);
    if (puzzle.type === 'bridges')
      reflected.islands = puzzle.islands.map((island) => ({
        ...island,
        cell: cell(island.cell),
      }));
    assert.equal(structuralKey(reflected), structuralKey(puzzle), puzzle.type);
  }
});

test('visibility metrics count peers across both axes, not a fictional line length', () => {
  const { metrics } = quality();
  const puzzle = { type: 'lightup', size: 7, walls: Array(49).fill(-2) };
  puzzle.solution = Array(49).fill(0);
  const result = metrics(puzzle);
  assert.equal(result.maxVisiblePeers, 12);
  assert.equal(Object.hasOwn(result, 'longestSightline'), false);
});
