'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/assist.js');
const I = require('../src/insights.js');
const scenes = require('../tools/official-catalogue.cjs')
  .load(path.join(__dirname, '..'), false)
  .puzzles.filter((p) => p.type === 'scene');

// Hints see the puzzle through this view: reading the stored answer is a test failure.
const blind = (p) =>
  new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw new Error('A scene hint read the stored solution.');
      return Reflect.get(target, key);
    },
  });
const fresh = (p) => C.registry.scene.initial(p);

// A bare 4x4 scene for hand fixtures. Rooms are rows or columns; only the clues matter here.
function fixture(roomOf, clues, names = ['Ada', 'Ben', 'Cat', 'Dee']) {
  return {
    type: 'scene',
    size: 4,
    victim: 'a',
    people: names.map((name, i) => ({ id: 'abcd'[i], name })),
    objects: [],
    rooms: Array.from({ length: 16 }, (_, c) => roomOf(c)),
    roomNames: ['Hall', 'Study'],
    clues,
  };
}
const notHall = (who) => ({ kind: 'notRoom', who, value: 0 });

test('every Only-one-square-left step on every official scene is sound and blind to the solution', () => {
  let steps = 0;
  for (const p of scenes) {
    const s = fresh(p);
    for (let k = 0; k < p.people.length; k++) {
      const hint = I.deduction(blind(p), s);
      if (!hint || hint.rule !== 'Only one square left') break;
      assert.equal(hint.value, undefined, p.id);
      assert.equal(hint.cells.length, 1, p.id);
      assert.equal(hint.cells[0], p.solution[hint.person], `${p.id}: ${hint.message}`);
      s.placements[hint.person] = hint.cells[0];
      steps++;
    }
  }
  assert.ok(steps >= 58, `walked ${steps} hint steps`);
});

test('at least 35 of 43 fresh official scenes offer a reasoning hint', () => {
  const silent = scenes.filter((p) => !I.deduction(blind(p), fresh(p)));
  assert.ok(scenes.length >= 43, `${scenes.length} official scenes`);
  assert.ok(
    scenes.length - silent.length >= 35,
    `${silent.length} of ${scenes.length} fresh scenes stay silent: ${silent.map((p) => p.id)}`,
  );
});

test('a row only one person can fill gets a message-only hint', () => {
  // Ada must be in row 1 (Hall); the others cannot stand in the Hall, so nobody else fits it.
  const p = fixture(
    (c) => (c < 4 ? 0 : 1),
    [{ kind: 'room', who: 'a', value: 0 }, notHall('b'), notHall('c'), notHall('d')],
  );
  const hint = I.deduction(p, fresh(p));
  assert.equal(hint.rule, 'Only one person fits a row');
  assert.match(hint.message, /Row 1 must hold Ada/);
  assert.deepEqual(hint.cells, [0, 1, 2, 3]);
  assert.equal(hint.value, undefined);
});

test('a column only one person can fill gets a message-only hint', () => {
  const p = fixture(
    (c) => (c % 4 === 0 ? 0 : 1),
    [{ kind: 'room', who: 'a', value: 0 }, notHall('b'), notHall('c'), notHall('d')],
  );
  const hint = I.deduction(p, fresh(p));
  assert.equal(hint.rule, 'Only one person fits a column');
  assert.match(hint.message, /Column A must hold Ada/);
  assert.deepEqual(hint.cells, [0, 4, 8, 12]);
});

test('pair clues prune candidates and the forced square names the clue', () => {
  // Ada is in column A and in a higher row than Ben, who is pinned to row 2: only A1 is left.
  const p = fixture(
    (c) => (c < 8 ? 0 : 1),
    [
      { kind: 'col', who: 'a', value: 0 },
      { kind: 'row', who: 'b', value: 1 },
      { kind: 'above', who: 'a', other: 'b' },
    ],
  );
  const hint = I.deduction(p, fresh(p));
  assert.equal(hint.rule, 'Only one square left');
  assert.equal(hint.person, 'a');
  assert.deepEqual(hint.cells, [0]);
  assert.match(hint.message, /Ada can only stand at A1/);
  assert.match(hint.message, /Ada was in a higher row than Ben/);
  // The clue that pinned Ben is part of the chain too (#851).
  assert.ok(hint.message.includes(C.clueText(p, p.clues[1])), hint.message);
});

test('a person with nowhere left to stand reports a conflict', () => {
  // Ada and Ben are both Hall-row people; Cat standing in row 1 leaves Ada no square.
  const p = fixture(
    (c) => (c < 4 ? 0 : 1),
    [
      { kind: 'room', who: 'a', value: 0 },
      { kind: 'room', who: 'b', value: 0 },
    ],
  );
  const s = fresh(p);
  s.placements.c = 0;
  const hint = I.deduction(p, s);
  assert.equal(hint.rule, 'Revisit a conflict');
  assert.match(hint.message, /Ada has no square left/);
  assert.deepEqual(hint.cells, []);
});

test('a finished layout points at the accusation without naming the culprit', () => {
  const p = scenes[0],
    s = fresh(p);
  s.placements = structuredClone(p.solution);
  const hint = I.deduction(blind(p), s);
  assert.equal(hint.rule, 'Time to accuse');
  assert.equal(hint.value, undefined);
  const culprit = p.people.find((x) => x.id === C.murderer(p, s)).name;
  assert.ok(!hint.message.includes(culprit));
  s.accused = C.murderer(p, s);
  assert.equal(I.deduction(blind(p), s), null);
});

test('scene hints stay silent when the reasoning helper is missing', () => {
  const assist = globalThis.AlibiAssist;
  delete globalThis.AlibiAssist;
  try {
    assert.equal(I.deduction(scenes[0], fresh(scenes[0])), null);
  } finally {
    globalThis.AlibiAssist = assist;
  }
});

test('hints on partial official scenes never contradict the solution (#851)', () => {
  // Leave each person out of the true layout in turn, and every second person out too.
  let hints = 0;
  for (const p of scenes) {
    const ids = p.people.map((x) => x.id),
      boards = [...ids.map((id) => [id]), ids.filter((_, i) => i % 2)];
    for (const missing of boards) {
      const s = fresh(p);
      for (const id of ids) if (!missing.includes(id)) s.placements[id] = p.solution[id];
      const hint = I.deduction(blind(p), s);
      if (!hint) continue;
      assert.notEqual(hint.rule, 'Revisit a conflict', `${p.id}: ${hint.message}`);
      if (hint.person) assert.equal(hint.cells[0], p.solution[hint.person], p.id);
      else if (hint.cells.length)
        assert.ok(
          missing.some((id) => hint.cells.includes(p.solution[id])),
          `${p.id}: ${hint.message}`,
        );
      hints++;
    }
  }
  assert.ok(hints > scenes.length, String(hints));
});
