'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('../tools/startup-fixture.cjs');
const C = globalThis.AlibiCore;

test('startup histories follow distinct reducer edits in undo and redo order', () => {
  for (const run of fixture(100, 40)) {
    const cells = run.puzzle.givens.flatMap((v, i) => (v === 0 ? [i] : []));
    const expected = [C.registry[run.puzzle.type].initial(run.puzzle)];
    for (let i = 0; i < 40; i++) {
      expected.push(
        C.registry[run.puzzle.type].reduce(run.puzzle, expected[i], {
          type: 'set',
          cell: cells[i % cells.length],
          value: (Math.floor(i / cells.length) % run.puzzle.size) + 1,
          pencil: true,
        }),
      );
    }
    assert.deepEqual(run.undo, expected.slice(0, 20));
    assert.deepEqual(run.state, expected[20]);
    assert.deepEqual(run.redo, expected.slice(21).reverse());
    assert.ok(new Set(expected.map(JSON.stringify)).size >= 20, run.key);
  }
});
