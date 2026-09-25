'use strict';
// Offline authoring evidence. Never imported by the game, hints or pack worker.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('../../src/core.js');
require('../../src/engines.js');
const C = require('../../src/bridges.js');
const { counters, bridgesGraph } = require('../../tests/helpers/family-studies-oracle.cjs');
const { adjacent, range } = require('../../tests/helpers/family-studies-shared.cjs');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function definitionHash(puzzle) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(puzzle))).digest('hex');
}
function relabel(values) {
  const labels = new Map();
  return values.map((value) => {
    if (!labels.has(value)) labels.set(value, labels.size);
    return labels.get(value);
  });
}
function transforms(values, size) {
  const output = [];
  for (const mirror of [false, true]) {
    for (let turns = 0; turns < 4; turns++) {
      const next = [];
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          let r = row;
          let c = mirror ? size - 1 - col : col;
          for (let turn = 0; turn < turns; turn++) [r, c] = [size - 1 - c, r];
          next.push(values[r * size + c]);
        }
      }
      output.push(next);
    }
  }
  return output;
}
function structuralKey(puzzle) {
  const { type, size } = puzzle;
  let values;
  if (['nonogram', 'binary', 'futoshiki', 'trail'].includes(type)) values = puzzle.solution;
  else if (type === 'lightup') values = puzzle.walls.map((wall) => Number(wall !== -2));
  else if (type === 'tents') values = range(size ** 2).map((cell) => Number(puzzle.trees.includes(cell)));
  else if (type === 'aquarium') values = puzzle.tanks;
  else if (type === 'bridges') values = range(size ** 2).map((cell) => Number(puzzle.islands.some((island) => island.cell === cell)));
  else if (type === 'network') {
    values = puzzle.tiles.map((mask) => {
      const degree = [1, 2, 4, 8].filter((bit) => mask & bit).length;
      return degree === 2 ? (mask === 5 || mask === 10 ? 'straight' : 'elbow') : String(degree);
    });
  } else throw new Error(`Unsupported study family: ${type}`);
  let variants = transforms(values, size);
  if (type === 'binary') variants.push(...transforms(values.map((value) => 1 - value), size));
  if (type === 'trail') variants.push(...transforms(values.map((value) => size ** 2 + 1 - value), size));
  if (['aquarium', 'futoshiki'].includes(type)) variants = variants.map(relabel);
  return `${type}:${size}:${variants.map((value) => value.join(',')).sort()[0]}`;
}
function metrics(puzzle) {
  const { type, size } = puzzle;
  const out = { size };
  if (type === 'binary') {
    out.givens = puzzle.givens.filter((v) => v >= 0).length;
    out.rowGivens = range(size).map((r) => puzzle.givens.slice(r * size, (r + 1) * size).filter((v) => v >= 0).length);
    out.colGivens = range(size).map((c) => puzzle.givens.filter((v, i) => i % size === c && v >= 0).length);
  } else if (type === 'futoshiki') {
    out.givens = puzzle.givens.filter(Boolean).length;
    out.horizontal = puzzle.inequalities.filter(({ a, b }) => Math.floor(a / size) === Math.floor(b / size)).length;
    out.vertical = puzzle.inequalities.length - out.horizontal;
  } else if (type === 'lightup') {
    out.white = puzzle.walls.filter((v) => v === -2).length;
    out.numbered = puzzle.walls.filter((v) => v >= 0).length;
    out.bulbs = puzzle.solution.filter(Boolean).length;
    out.maxVisiblePeers = Math.max(...puzzle.walls.map((v, cell) => v === -2 ? C.extras.visible(puzzle, cell).length : 0));
  } else if (type === 'tents') {
    const candidates = puzzle.trees.map((tree) => adjacent(tree, size).filter((cell) => !puzzle.trees.includes(cell)));
    out.trees = puzzle.trees.length;
    out.sharedCandidates = range(size ** 2).filter((cell) => candidates.filter((set) => set.includes(cell)).length > 1).length;
    out.branchingTrees = candidates.filter((set) => set.length > 1).length;
    out.multipleRows = puzzle.rowTargets.filter((v) => v > 1).length;
    out.multipleCols = puzzle.colTargets.filter((v) => v > 1).length;
  } else if (type === 'aquarium') {
    const rows = C.extras.tankRows(puzzle);
    out.tanks = rows.length;
    out.tallTanks = rows.filter((r) => r.length >= 3).length;
    out.partialTanks = rows.filter((r, tank) => puzzle.solution[tank] > 0 && puzzle.solution[tank] < r.length).length;
    out.interiorRows = puzzle.rowTargets.filter((v) => v > 0 && v < size).length;
    out.interiorCols = puzzle.colTargets.filter((v) => v > 0 && v < size).length;
  } else if (type === 'network') {
    const degree = puzzle.tiles.map((m) => [1, 2, 4, 8].filter((bit) => m & bit).length);
    out.junctions = degree.filter((v) => v >= 3).length;
    out.leaves = degree.filter((v) => v === 1).length;
    out.locked = puzzle.locked.length;
  } else if (type === 'trail') {
    const anchors = puzzle.givens.filter(Boolean).sort((a, b) => a - b);
    out.givens = anchors.length;
    out.maxGap = Math.max(...anchors.slice(1).map((value, i) => value - anchors[i]));
    const cells = range(size ** 2).sort((a, b) => puzzle.solution[a] - puzzle.solution[b]);
    out.turns = cells.slice(2).filter((cell, i) => cell - cells[i + 1] !== cells[i + 1] - cells[i]).length;
    out.detours = anchors.slice(1).filter((value, i) => {
      const a = cells[anchors[i] - 1];
      const b = cells[value - 1];
      const distance = Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size);
      return value - anchors[i] > distance;
    }).length;
  } else if (type === 'bridges') {
    const graph = bridgesGraph(puzzle);
    out.islands = puzzle.islands.length;
    out.routes = graph.edges.length;
    out.cycleRank = graph.edges.length - puzzle.islands.length + 1;
    out.crossings = graph.crosses.reduce((sum, crossing) => sum + crossing.length, 0) / 2;
    out.unused = puzzle.solution.filter((v) => v === 0).length;
    out.doubles = puzzle.solution.filter((v) => v === 2).length;
  }
  return out;
}
function replay(puzzle) {
  const engine = C.registry[puzzle.type];
  let state = engine.initial(puzzle);
  C.validateState(puzzle, state);
  const actions = puzzle.type === 'aquarium'
    ? puzzle.solution.map((value, tank) => ({ type: 'level', tank, value }))
    : puzzle.type === 'network'
      ? puzzle.solution.flatMap((count, cell) => range(count).map(() => ({ type: 'rotate', cell })))
      : puzzle.solution.map((value, cell) => ({ type: 'set', cell, value }));
  for (const action of actions) {
    const before = JSON.stringify(state);
    const next = engine.reduce(puzzle, state, action);
    assert.equal(JSON.stringify(state), before, `${puzzle.id}: reducer mutated its input`);
    C.validateState(puzzle, next);
    state = next;
  }
  assert.ok(engine.complete(puzzle, state), `${puzzle.id}: reducer replay did not complete`);
  return actions.length;
}
function certify(puzzle) {
  C.validateDefinition(puzzle);
  assert.ok(counters[puzzle.type], `No independent oracle for ${puzzle.type}`);
  const budget = puzzle.type === 'bridges' ? 100000 : 250000;
  const native = C.solve(puzzle, null, 2, budget);
  assert.ok(native.nodes < budget, `${puzzle.id}: native budget exhausted`);
  assert.deepEqual(native.solutions, [puzzle.solution], `${puzzle.id}: native answer/uniqueness`);
  const independent = counters[puzzle.type](puzzle, 2);
  assert.equal(independent.count, 1, `${puzzle.id}: independent uniqueness`);
  assert.deepEqual(independent.first, puzzle.solution, `${puzzle.id}: independent answer`);
  assert.ok(independent.nodes <= 500000, `${puzzle.id}: independent search exceeds review bound`);
  return {
    id: puzzle.id,
    revision: puzzle.revision,
    definitionSha256: definitionHash(puzzle),
    structuralKey: structuralKey(puzzle),
    nativeNodes: native.nodes,
    independentNodes: independent.nodes,
    semanticSolutions: 1,
    replayActions: replay(puzzle),
    metrics: metrics(puzzle),
  };
}
module.exports = { structuralKey, definitionHash, transforms, metrics, certify, replay };
