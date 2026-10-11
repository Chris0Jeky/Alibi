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

const draft = C.createSceneDraft({ seed: 7 });
const P1 = 'person-1';
const P2 = 'person-2';

test('self-referential relational clue is rejected in validateSceneDraft', () => {
  const bad = { ...draft, clues: [{ kind: 'left', who: P1, other: P1 }] };
  assert.throws(() => C.validateSceneDraft(bad));
});

test('valid relational clue still passes validateSceneDraft', () => {
  const good = { ...draft, clues: [{ kind: 'left', who: P1, other: P2 }] };
  assert.doesNotThrow(() => C.validateSceneDraft(good));
});
