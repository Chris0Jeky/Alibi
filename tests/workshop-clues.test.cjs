'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = { structuredClone, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8'), ctx);
const C = ctx.AlibiCore;

// Entry validation reuses boot-time draft shape rules, so the fixture must be
// a full valid draft; the first test pins that blame lies with the clue.
const draft = C.createSceneDraft({ seed: 7 });
const P1 = 'person-1';
const P2 = 'person-2';

test('workshop clue helper is exported and the fixture draft is valid', () => {
  assert.equal(typeof C.validateSceneClue, 'function');
  assert.doesNotThrow(() => C.validateSceneDraft(draft));
});

test('unknown clue kind is rejected at entry', () => {
  assert.throws(() => C.validateSceneClue({ kind: 'nope', who: P1 }, draft), /does not fit/);
});

test('unknown person is rejected at entry', () => {
  assert.throws(
    () => C.validateSceneClue({ kind: 'room', who: 'ghost', value: 0 }, draft),
    /does not fit/,
  );
});

test('NaN and out-of-range values are rejected at entry', () => {
  assert.throws(
    () => C.validateSceneClue({ kind: 'room', who: P1, value: NaN }, draft),
    /does not fit/,
  );
  assert.throws(
    () => C.validateSceneClue({ kind: 'room', who: P1, value: 99 }, draft),
    /does not fit/,
  );
  assert.throws(
    () => C.validateSceneClue({ kind: 'row', who: P1, value: 5 }, draft),
    /does not fit/,
  );
  assert.throws(
    () => C.validateSceneClue({ kind: 'near', who: P1, value: 25 }, draft),
    /does not fit/,
  );
});

test('unknown relational partners are rejected at entry', () => {
  assert.throws(
    () => C.validateSceneClue({ kind: 'above', who: P1, other: 'ghost' }, draft),
    /does not fit/,
  );
  assert.throws(() => C.validateSceneClue({ kind: 'sameRoom', who: P1 }, draft), /does not fit/);
});

test('entry follows draft-shape leniency for self-relational clues', () => {
  // Draft rules permit unverifiable shapes while editing (publication
  // validation rejects these); addClue's own same-person check guards the UI.
  assert.doesNotThrow(() => C.validateSceneClue({ kind: 'left', who: P1, other: P1 }, draft));
});

test('a valid clue of each kind is accepted', () => {
  const valid = [
    { kind: 'room', who: P1, value: 0 },
    { kind: 'notRoom', who: P1, value: 3 },
    { kind: 'row', who: P1, value: 0 },
    { kind: 'col', who: P1, value: 4 },
    { kind: 'near', who: P1, value: 24 },
    { kind: 'edge', who: P1 },
    { kind: 'notEdge', who: P1 },
    { kind: 'left', who: P1, other: P2 },
    { kind: 'above', who: P1, other: P2 },
    { kind: 'sameRoom', who: P1, other: P2 },
    { kind: 'differentRoom', who: P1, other: P2 },
    // A stray value on an edge clue is ignored by draft shape rules (harmless).
    { kind: 'edge', who: P1, value: 0 },
  ];
  for (const clue of valid) assert.doesNotThrow(() => C.validateSceneClue(clue, draft), clue.kind);
});
