'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const pack = require('../content/extra/crime-scene-variations.json');
const notes = require('../content/curation/editorial/crime-scene-variations.json');

const existingScenes = [
  ...require('../content/catalog.json').puzzles,
  ...require('../content/curation/packs/scene.json').puzzles,
  ...require('../content/extra/expert-families.json').puzzles,
].filter((puzzle) => puzzle.type === 'scene');

function permutations(values) {
  const out = [];
  function visit(remaining, chosen) {
    if (!remaining.length) {
      out.push(chosen);
      return;
    }
    for (let index = 0; index < remaining.length; index++)
      visit(
        [...remaining.slice(0, index), ...remaining.slice(index + 1)],
        [...chosen, remaining[index]],
      );
  }
  visit(values, []);
  return out;
}

const ORDERS = permutations([0, 1, 2, 3, 4]);

function clueHolds(puzzle, clue, placements) {
  const cell = placements[clue.who];
  const row = Math.floor(cell / puzzle.size);
  const column = cell % puzzle.size;
  if (clue.other) {
    const other = placements[clue.other];
    if (clue.kind === 'left') return column < other % puzzle.size;
    if (clue.kind === 'above') return row < Math.floor(other / puzzle.size);
    if (clue.kind === 'sameRoom') return puzzle.rooms[cell] === puzzle.rooms[other];
    if (clue.kind === 'differentRoom') return puzzle.rooms[cell] !== puzzle.rooms[other];
    return false;
  }
  if (clue.kind === 'room') return puzzle.rooms[cell] === clue.value;
  if (clue.kind === 'notRoom') return puzzle.rooms[cell] !== clue.value;
  if (clue.kind === 'row') return row === clue.value;
  if (clue.kind === 'col') return column === clue.value;
  if (clue.kind === 'edge')
    return row === 0 || column === 0 || row === puzzle.size - 1 || column === puzzle.size - 1;
  if (clue.kind === 'notEdge')
    return row > 0 && column > 0 && row < puzzle.size - 1 && column < puzzle.size - 1;
  if (clue.kind === 'near') {
    const objectRow = Math.floor(clue.value / puzzle.size);
    const objectColumn = clue.value % puzzle.size;
    return Math.abs(objectRow - row) + Math.abs(objectColumn - column) === 1;
  }
  return false;
}

function independentSolutions(puzzle, clues = puzzle.clues) {
  const ids = puzzle.people.map((person) => person.id);
  const blocked = new Set(puzzle.objects.map((object) => object.cell));
  const found = [];
  let nodes = 0;
  for (const rows of ORDERS) {
    for (const columns of ORDERS) {
      nodes++;
      const placements = Object.fromEntries(
        ids.map((id, index) => [id, rows[index] * puzzle.size + columns[index]]),
      );
      if (Object.values(placements).some((cell) => blocked.has(cell))) continue;
      if (!clues.every((clue) => clueHolds(puzzle, clue, placements))) continue;
      const victimRoom = puzzle.rooms[placements[puzzle.victim]];
      if (
        Object.values(placements).filter((cell) => puzzle.rooms[cell] === victimRoom).length !== 2
      )
        continue;
      found.push(placements);
      if (found.length >= 2) return { found, nodes };
    }
  }
  return { found, nodes };
}

function connectedRooms(puzzle) {
  const byRoom = new Map();
  puzzle.rooms.forEach((room, cell) => byRoom.set(room, [...(byRoom.get(room) || []), cell]));
  for (const cells of byRoom.values()) {
    const remaining = new Set(cells);
    const queue = [cells[0]];
    remaining.delete(cells[0]);
    while (queue.length) {
      const cell = queue.shift();
      const row = Math.floor(cell / puzzle.size);
      const column = cell % puzzle.size;
      for (const next of [cell - puzzle.size, cell + puzzle.size, cell - 1, cell + 1]) {
        if (!remaining.has(next)) continue;
        const nextRow = Math.floor(next / puzzle.size);
        const nextColumn = next % puzzle.size;
        if (Math.abs(nextRow - row) + Math.abs(nextColumn - column) !== 1) continue;
        remaining.delete(next);
        queue.push(next);
      }
    }
    if (remaining.size) return false;
  }
  return true;
}

function normalizedGeometry(rooms, size) {
  const transforms = [];
  for (const flip of [false, true]) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const values = [];
      for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
          let sourceRow = row;
          let sourceColumn = column;
          if (flip) sourceColumn = size - 1 - sourceColumn;
          for (let turn = 0; turn < rotation; turn++)
            [sourceRow, sourceColumn] = [size - 1 - sourceColumn, sourceRow];
          values.push(rooms[sourceRow * size + sourceColumn]);
        }
      }
      const labels = new Map();
      transforms.push(
        values
          .map((value) => {
            if (!labels.has(value)) labels.set(value, labels.size);
            return labels.get(value);
          })
          .join(''),
      );
    }
  }
  return transforms.sort()[0];
}

const profileChecks = {
  'room-relationship-chain': (kinds) =>
    (kinds.sameRoom || 0) + (kinds.differentRoom || 0) >= 3 && !kinds.row && !kinds.col,
  'furniture-exclusion': (kinds) =>
    (kinds.near || 0) >= 2 && (kinds.notRoom || 0) + (kinds.notEdge || 0) >= 2,
  'relative-order-lattice': (kinds) =>
    (kinds.left || 0) + (kinds.above || 0) >= 5 && !kinds.row && !kinds.col,
  'coordinate-crossfire': (kinds) => (kinds.row || 0) >= 2 && (kinds.col || 0) >= 2,
  'edge-and-room-pressure': (kinds) =>
    (kinds.edge || 0) + (kinds.notEdge || 0) >= 3 && (kinds.room || 0) + (kinds.notRoom || 0) >= 2,
  'mixed-late-room-deduction': (kinds) =>
    Object.keys(kinds).length >= 6 && (kinds.sameRoom || 0) + (kinds.differentRoom || 0) >= 1,
};

test('crime-scene expansion adds six structurally distinct provisional cases', () => {
  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.puzzles.length, 6);
  assert.equal(pack.puzzles.filter((puzzle) => puzzle.difficulty === 'Master').length, 3);
  assert.equal(pack.puzzles.filter((puzzle) => puzzle.difficulty === 'Grandmaster').length, 3);
  assert.equal(new Set(pack.puzzles.map((puzzle) => puzzle.id)).size, pack.puzzles.length);
  assert.equal(notes.schemaVersion, 1);
  assert.equal(notes.cases.length, pack.puzzles.length);

  const previousGeometries = new Set(
    existingScenes.map((puzzle) => normalizedGeometry(puzzle.rooms, puzzle.size)),
  );
  const newGeometries = new Set();
  for (const puzzle of pack.puzzles) {
    C.validateDefinition(puzzle);
    assert.equal(puzzle.type, 'scene', puzzle.id);
    assert.equal(puzzle.revision, 1, puzzle.id);
    assert.equal(puzzle.difficultyStatus, 'provisional', puzzle.id);
    assert.match(puzzle.difficultyEvidence, /^.{20,240}$/s, puzzle.id);
    assert.equal(connectedRooms(puzzle), true, `${puzzle.id} has connected rooms`);
    assert.ok(new Set(puzzle.rooms).size >= 4, `${puzzle.id} uses at least four rooms`);

    const geometry = normalizedGeometry(puzzle.rooms, puzzle.size);
    assert.equal(previousGeometries.has(geometry), false, `${puzzle.id} has new floor geometry`);
    assert.equal(
      newGeometries.has(geometry),
      false,
      `${puzzle.id} geometry is not a sibling reskin`,
    );
    newGeometries.add(geometry);

    const note = notes.cases.find((candidate) => candidate.id === puzzle.id);
    assert.ok(note, `${puzzle.id} has an editorial curation note`);
    assert.match(note.structuralDistinction, /^.{20,400}$/s, puzzle.id);
    assert.ok(Array.isArray(note.intendedReasoningPath), puzzle.id);
    assert.ok(note.intendedReasoningPath.length >= 3, puzzle.id);
    assert.ok(
      note.intendedReasoningPath.every((step) => /^.{10,240}$/s.test(step)),
      puzzle.id,
    );
    assert.ok(profileChecks[note.profile], `${puzzle.id} uses a known design profile`);
    const kinds = Object.fromEntries(
      Object.entries(
        puzzle.clues.reduce((counts, clue) => {
          counts[clue.kind] = (counts[clue.kind] || 0) + 1;
          return counts;
        }, {}),
      ),
    );
    assert.equal(profileChecks[note.profile](kinds), true, `${puzzle.id} realizes ${note.profile}`);
  }
});

test('crime-scene expansion is independently unique and matches the native solver', () => {
  for (const puzzle of pack.puzzles) {
    const independent = independentSolutions(puzzle);
    assert.deepEqual(independent.found, [puzzle.solution], `${puzzle.id} independent solution`);
    assert.ok(independent.nodes <= 14400, `${puzzle.id} independent search is bounded`);
    assert.equal(
      puzzle.clues.some(
        (clue) =>
          clue.kind === 'sameRoom' && (clue.who === puzzle.victim || clue.other === puzzle.victim),
      ),
      false,
      `${puzzle.id} does not disclose the culprit through a victim same-room clue`,
    );
    puzzle.clues.forEach((_, index) => {
      const alternatives = independentSolutions(puzzle, [
        ...puzzle.clues.slice(0, index),
        ...puzzle.clues.slice(index + 1),
      ]);
      assert.equal(alternatives.found.length, 2, `${puzzle.id} clue ${index + 1} is necessary`);
    });
    const native = C.solve(puzzle, null, 2, 250000);
    assert.deepEqual(native.solutions, [puzzle.solution], `${puzzle.id} native solution`);
    assert.ok(native.nodes < 250000, `${puzzle.id} native search is bounded`);
  }
});

test('crime-scene expansion is registered without reinterpreting published packs', () => {
  const registry = JSON.parse(fs.readFileSync('content/official-packs.json', 'utf8'));
  assert.ok(registry.packs.includes('extra/crime-scene-variations.json'));
  const existingIds = new Set(existingScenes.map((puzzle) => puzzle.id));
  for (const puzzle of pack.puzzles) assert.equal(existingIds.has(puzzle.id), false, puzzle.id);
});
