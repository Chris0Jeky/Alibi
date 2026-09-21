'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const E = require('../src/club-engines.js');

const DIRECTIONS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

function parse(rows) {
  assert.ok(Array.isArray(rows) && rows.length >= 3, 'archive map has rows');
  const height = rows.length;
  const width = rows[0].length;
  const walls = new Set();
  const goals = new Set();
  const crates = [];
  let player = -1;

  rows.forEach((row, r) => {
    assert.equal(row.length, width, 'archive map is rectangular');
    [...row].forEach((tile, c) => {
      const cell = r * width + c;
      if (tile === '#') walls.add(cell);
      if ('.+*'.includes(tile)) goals.add(cell);
      if ('$*'.includes(tile)) crates.push(cell);
      if ('@+'.includes(tile)) {
        assert.equal(player, -1, 'archive map has one player');
        player = cell;
      }
    });
  });

  assert.notEqual(player, -1, 'archive map has a player');
  assert.equal(crates.length, goals.size, 'archive map balances crates and goals');
  return { width, height, walls, goals, player, crates: crates.sort((a, b) => a - b) };
}

function stateKey(player, crates) {
  return `${player}:${crates.join(',')}`;
}

function isStaticDeadCorner(cell, board) {
  if (board.goals.has(cell)) return false;
  const row = Math.floor(cell / board.width);
  const column = cell % board.width;
  const wall = (r, c) =>
    r < 0 || r >= board.height || c < 0 || c >= board.width || board.walls.has(r * board.width + c);
  return (
    (wall(row - 1, column) && wall(row, column - 1)) ||
    (wall(row - 1, column) && wall(row, column + 1)) ||
    (wall(row + 1, column) && wall(row, column - 1)) ||
    (wall(row + 1, column) && wall(row, column + 1))
  );
}

function move(board, state, direction) {
  const [dr, dc] = DIRECTIONS[direction];
  const row = Math.floor(state.player / board.width);
  const column = state.player % board.width;
  const nextRow = row + dr;
  const nextColumn = column + dc;
  if (nextRow < 0 || nextRow >= board.height || nextColumn < 0 || nextColumn >= board.width)
    return null;

  const next = nextRow * board.width + nextColumn;
  if (board.walls.has(next)) return null;
  const crates = new Set(state.crates);
  let pushed = false;
  if (crates.has(next)) {
    const beyondRow = nextRow + dr;
    const beyondColumn = nextColumn + dc;
    if (
      beyondRow < 0 ||
      beyondRow >= board.height ||
      beyondColumn < 0 ||
      beyondColumn >= board.width
    )
      return null;
    const beyond = beyondRow * board.width + beyondColumn;
    if (board.walls.has(beyond) || crates.has(beyond)) return null;
    crates.delete(next);
    crates.add(beyond);
    if (isStaticDeadCorner(beyond, board)) return null;
    pushed = true;
  }
  return {
    player: next,
    crates: [...crates].sort((a, b) => a - b),
    pushed,
  };
}

function minimumPushes(rows, maxStates = 250000) {
  const board = parse(rows);
  const initial = { player: board.player, crates: board.crates };
  const best = new Map([[stateKey(initial.player, initial.crates), 0]]);
  const buckets = [[initial]];
  let visited = 0;

  for (let pushes = 0; pushes < buckets.length; pushes++) {
    const queue = buckets[pushes] || [];
    for (let at = 0; at < queue.length; at++) {
      const state = queue[at];
      const key = stateKey(state.player, state.crates);
      if (best.get(key) !== pushes) continue;
      visited++;
      assert.ok(visited <= maxStates, `minimum-push search exceeded ${maxStates} states`);
      if (state.crates.every((cell) => board.goals.has(cell))) return { pushes, visited };

      for (let direction = 0; direction < DIRECTIONS.length; direction++) {
        const next = move(board, state, direction);
        if (!next) continue;
        const cost = pushes + Number(next.pushed);
        const nextKey = stateKey(next.player, next.crates);
        if (cost >= (best.get(nextKey) ?? Infinity)) continue;
        best.set(nextKey, cost);
        (buckets[cost] ||= []).push(next);
      }
    }
  }
  return null;
}

test('Archive Heist additions have independently verified minimum-push progression', () => {
  assert.equal(E.warehouse.maps.length, 9, 'the expansion appends exactly three rooms');
  const proofs = E.warehouse.maps.map((room) => minimumPushes(room.map));
  assert.ok(proofs.every(Boolean), 'every Archive room has an independent minimum-push proof');

  const baseline = proofs.slice(0, 6).map((proof) => proof.pushes);
  const additions = proofs.slice(6).map((proof) => proof.pushes);
  assert.deepEqual(additions, [7, 8, 11], 'authored minimum-push depths remain pinned');
  assert.ok(
    additions.every((pushes, index) => index === 0 || pushes > additions[index - 1]),
    'the three added rooms form a strictly increasing push-depth sequence',
  );
  assert.ok(
    additions.at(-1) > Math.max(...baseline),
    'the final added room requires more pushes than every original room',
  );
});
