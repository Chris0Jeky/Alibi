import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/block-cabinet/cascade.mjs';
import { dropOrigin, FrameLoop } from '../src/game-feel/runtime.mjs';

test('deterministic deals, immutable shape definitions and distinct rules identity', () => {
  assert.deepEqual(C.initial('HELLO'), C.initial('HELLO'));
  assert.equal(C.initial().rules, C.RULES);
  assert.throws(() => {
    C.SHAPES[0].cells[0][0] = 4;
  });
  assert.throws(() => C.initial('<svg>'));
});
test('geometry rejects out-of-board drops rather than silently clamping', () => {
  const b = { left: 0, top: 0, width: 400 },
    shape = [
      [0, 0],
      [1, 0],
    ];
  assert.equal(dropOrigin({ x: 50, y: 25 }, b, shape), 0);
  assert.equal(dropOrigin({ x: 390, y: 25 }, b, shape), -1);
  assert.equal(dropOrigin({ x: 50, y: 85 }, b, shape, undefined, 60), 0);
  assert.equal(dropOrigin({ x: -90, y: 25 }, b, shape), -1);
});
test('clear crossing lines simultaneously, count intersection relic only once', () => {
  const board = Array(64).fill(0);
  for (let i = 0; i < 8; i++) {
    board[56 + i] = 1;
    board[i * 8] = 1;
  }
  board[56] = 2;
  const r = C.resolve(board);
  assert.equal(r.relics, 1);
  assert.equal(r.bonus, 20);
  assert.equal(r.waves[0].cells.length, 15);
  assert.equal(r.board.filter(Boolean).length, 0);
});
test('gravity packs columns preserving order and reports fall events', () => {
  const board = Array(64).fill(0);
  board[0] = 2;
  board[24] = 1;
  const r = C.settle(board);
  assert.equal(r.board[48], 2);
  assert.equal(r.board[56], 1);
  assert.equal(r.falls.length, 2);
  assert.deepEqual(C.settle(r.board).board, r.board);
});
test('a first clear can trigger a second scored cascade', () => {
  const board = Array(64).fill(0);
  for (let x = 0; x < 8; x++) {
    board[56 + x] = 1;
    board[(x % 2 ? 5 : 4) * 8 + x] = 1;
  }
  const result = C.resolve(board);
  assert.equal(result.waves.length, 2);
  assert.equal(result.bonus, 30);
});
test('moves are immutable and blocked moves never mutate input', () => {
  const s = C.initial(),
    copy = structuredClone(s),
    slot = 0,
    cell = C.placements(s, slot)[0];
  const q = C.move(s, slot, cell);
  assert.deepEqual(s, copy);
  assert.equal(q.turn, 1);
  assert.equal(q.tray[slot], null);
  assert.throws(() => C.move(s, slot, 64));
  assert.deepEqual(s, copy);
});
test('rotation normalizes coordinates; a quarter turn costs exactly one charge', () => {
  for (const p of C.SHAPES)
    for (let r = 0; r < 4; r++) {
      const cells = C.shape(p.id, r).cells;
      assert.equal(cells.length, p.cells.length);
      assert.equal(Math.min(...cells.map(([x]) => x)), 0);
      assert.equal(Math.min(...cells.map(([, y]) => y)), 0);
    }
  const s = C.initial(),
    cell = C.placements(s, 0, 1)[0],
    q = C.move(s, 0, cell, 1);
  assert.equal(q.charges, 2);
  assert.equal(C.legal({ ...s, charges: 0 }, 0, cell, 1), false);
});
test('tray refills only after all three pieces are used', () => {
  let s = C.initial();
  for (let slot = 0; slot < 3; slot++) {
    s = C.move(s, slot, C.placements(s, slot)[0]);
    if (slot < 2) assert.equal(s.round, 0);
  }
  assert.equal(s.round, 1);
  assert.ok(s.tray.every((x) => x !== null));
});
test('strict replay validation checks redo and bounded payloads', () => {
  const r = C.record(),
    s = C.replay(r);
  r.log.push({ slot: 0, cell: C.placements(s, 0)[0], rotation: 0 });
  assert.equal(C.replay(r).turn, 1);
  r.redo.push(r.log.pop());
  assert.equal(C.replay(r).turn, 0);
  assert.throws(() => C.replay({ ...r, board: [] }));
  assert.throws(() => C.replay({ ...r, redo: [{ slot: 0, cell: 64, rotation: 0 }] }));
  assert.throws(() => C.replay({ ...r, rules: 'future' }));
  assert.throws(() => C.replay({ ...r, log: Array(36).fill({}) }));
});
test('100 seeded trajectories preserve bounds, relic conservation and exact replay', () => {
  for (let n = 0; n < 100; n++) {
    const run = C.record('CHECK-' + n);
    let s = C.replay(run);
    while (!s.done) {
      let action = null;
      for (let slot = 0; slot < 3 && !action; slot++)
        for (let rotation = 0; rotation < 4 && !action; rotation++) {
          const list = C.placements(s, slot, rotation);
          if (list.length) action = { slot, rotation, cell: list[(n + s.turn) % list.length] };
        }
      assert.ok(action);
      run.log.push(action);
      s = C.move(s, action.slot, action.cell, action.rotation);
      assert.equal(s.board.length, 64);
      assert.ok(s.board.every((v) => [0, 1, 2].includes(v)));
      assert.equal(s.relics + s.board.filter((v) => v === 2).length, 8);
      assert.ok(s.charges >= 0 && s.charges <= 3);
      assert.deepEqual(C.replay(run), s);
    }
    assert.ok(s.turn <= 35);
  }
});
test('frame scheduler sleeps when settled and disposes its scheduled frame', () => {
  let callback,
    id = 0,
    draws = 0;
  const cancelled = [];
  const host = {
    requestAnimationFrame: (f) => {
      callback = f;
      return ++id;
    },
    cancelAnimationFrame: (n) => cancelled.push(n),
    performance: { now: () => 0 },
  };
  const loop = new FrameLoop(() => {
    draws++;
    return false;
  }, host);
  loop.invalidate();
  loop.invalidate();
  assert.equal(id, 1);
  callback(10);
  assert.equal(draws, 1);
  assert.equal(loop.stats().scheduled, false);
  loop.invalidate();
  loop.dispose();
  assert.deepEqual(cancelled, [2]);
  loop.invalidate();
  assert.equal(id, 2);
});
