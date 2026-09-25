'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const I = require('../src/insights.js');

function fixture(rows, marks) {
  const p = {
    type: 'lightup',
    size: rows.length,
    walls: rows
      .join('')
      .split('')
      .map((v) => (v === '.' ? -2 : v === '#' ? -1 : Number(v))),
    get solution() {
      throw Error('Hint read the answer');
    },
  };
  const s = C.registry.lightup.initial(p);
  for (const [i, value] of marks) s.cells[i] = value;
  return { p, s };
}
function expectConflict(p, s) {
  assert.deepEqual(C.registry.lightup.validate(p, s), [], 'marks have no direct rule violation');
  const before = structuredClone(s);
  const hint = I.deduction(p, s);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.equal(hint.value, undefined, 'contradiction must never carry a move');
  assert.match(hint.message, /marks/i);
  assert.ok(hint.cells.length > 0);
  assert.deepEqual(s, before);
}
for (const [name, rows, marks] of [
  ['forced bulb meets a zero wall', ['1.0', '...', '...'], [[3, 0]]],
  ['full-wall cross removes the last required neighbour', ['0.1', '...', '...'], [[5, 0]]],
  [
    'lit-square cross removes the last required neighbour',
    ['1..', '...', '...'],
    [
      [3, 0],
      [2, 1],
    ],
  ],
]) {
  test(name, () => {
    const { p, s } = fixture(rows, marks);
    expectConflict(p, s);
  });
}

test('validate the entire forced set even when either first bulb alone is legal', () => {
  const { p, s } = fixture(['.2.', '1..', '...'], [[2, 0]]);
  for (const cell of [4, 0]) {
    const next = C.registry.lightup.reduce(p, s, { type: 'set', cell, value: 1 });
    assert.deepEqual(C.registry.lightup.validate(p, next), []);
  }
  expectConflict(p, s);
});

test('published lightup-02 wrong B5 cross gives conflict guidance, not an illegal C4 cross', () => {
  const source = load(process.cwd(), false).puzzles.find((p) => p.id === 'lightup-02');
  const p = new Proxy(source, {
    get(target, key) {
      if (key === 'solution') throw Error('Hint consulted the published answer');
      return target[key];
    },
  });
  let s = C.registry.lightup.initial(p);
  for (const [cell, value] of [
    [13, 1],
    [3, 0],
    [8, 0],
    [18, 0],
    [4, 1],
    [7, 1],
    [21, 0],
  ])
    s = C.registry.lightup.reduce(p, s, { type: 'set', cell, value });
  expectConflict(p, s);
});

// Independent local-rule checker: no engine adjacency/visibility/validation helpers.
function legal(p, cells) {
  const n = p.size;
  const adjacent = (a, b) =>
    Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs((a % n) - (b % n)) === 1;
  const bulbs = cells.flatMap((v, i) => (v === 1 ? [i] : []));
  for (const a of bulbs) {
    if (p.walls[a] !== -2) return false;
    for (const b of bulbs) {
      if (b <= a) continue;
      const sameRow = Math.floor(a / n) === Math.floor(b / n);
      if (!sameRow && a % n !== b % n) continue;
      let blocked = false;
      for (let i = a + (sameRow ? 1 : n); i < b; i += sameRow ? 1 : n)
        if (p.walls[i] !== -2) blocked = true;
      if (!blocked) return false;
    }
  }
  return p.walls.every((wall, i) => {
    if (wall < 0) return true;
    const neighbours = p.walls.flatMap((v, j) => (v === -2 && adjacent(i, j) ? [j] : []));
    return (
      neighbours.filter((j) => cells[j] === 1).length <= wall &&
      neighbours.filter((j) => cells[j] !== 0).length >= wall
    );
  });
}

test('every recommendation preserves local rules across all ternary marks on small layouts', () => {
  let checked = 0,
    moves = 0,
    conflicts = 0;
  for (const rows of [
    ['1.0', '...', '...'],
    ['0.1', '...', '...'],
    ['.2.', '1..', '...'],
    ['...', '.4.', '...'],
  ]) {
    const { p } = fixture(rows, []);
    const open = p.walls.flatMap((v, i) => (v === -2 ? [i] : []));
    for (let mask = 0; mask < 3 ** open.length; mask++) {
      const s = C.registry.lightup.initial(p);
      let digits = mask;
      for (const i of open) {
        s.cells[i] = (digits % 3) - 1;
        digits = Math.floor(digits / 3);
      }
      if (!legal(p, s.cells)) continue;
      checked++;
      const before = structuredClone(s),
        hint = I.deduction(p, s);
      assert.deepEqual(s, before);
      if (!hint) continue;
      if (hint.value === undefined) {
        conflicts++;
        continue;
      }
      assert.equal(s.cells[hint.cells[0]], -1);
      const next = C.registry.lightup.reduce(p, s, {
        type: 'set',
        cell: hint.cells[0],
        value: hint.value,
      });
      assert.ok(legal(p, next.cells), JSON.stringify({ rows, cells: s.cells, hint }));
      moves++;
    }
  }
  assert.ok(checked > 100 && moves > 100 && conflicts > 10);
  console.log(
    `Lantern local oracle: ${checked} states, ${moves} safe moves, ${conflicts} conflict reports`,
  );
});
