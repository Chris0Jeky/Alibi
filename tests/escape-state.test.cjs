'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../tools/escape-state.cjs');
const S = fs.existsSync(file) ? require(file) : {};
const { fixture, prose } = require('./fixtures/escape-room.cjs');
test('finite room APIs exist', () => {
  for (const name of ['validate', 'initial', 'transition', 'project'])
    assert.equal(typeof S[name], 'function');
});
test('valid fixture is immutable and the initial room is not completed', () => {
  const d = fixture(), before = JSON.stringify(d);
  assert.equal(S.validate(d).stateSpace, 4);
  assert.deepEqual(S.initial(d), { key: 'held', door: 'closed' });
  assert.equal(S.project(d, S.initial(d), true).won, false);
  assert.equal(JSON.stringify(d), before);
});
const invalid = [
  ['future format', d => { d.format = 'postern-escape-2'; }, /format/],
  ['unknown field', d => { d.future = true; }, /future/],
  ['zero revision', d => { d.revision = 0; }, /revision/],
  ['unsafe revision', d => { d.revision = 2 ** 54; }, /revision/],
  ['blank title', d => { d.title = ' '; }, /title/],
  ['long title', d => { d.title = 'x'.repeat(121); }, /title/],
  ['long prose', d => { d.intro.storyOff = 'x'.repeat(1801); }, /storyOff/],
  ['missing presentation', d => { delete d.intro.storyOff; }, /storyOff/],
  ['invalid id', d => { d.id = '__proto__'; }, /id/],
  ['no variables', d => { d.variables = []; }, /variables/],
  ['too many variables', d => { d.variables = Array(9).fill(d.variables[0]); }, /variables/],
  ['too few values', d => { d.variables[0].values = ['held']; }, /values/],
  ['duplicate values', d => { d.variables[0].values = ['held', 'held']; }, /duplicate/],
  ['invalid initial', d => { d.variables[0].initial = 'absent'; }, /initial/],
  ['duplicate global id', d => { d.objects[0].id = 'key'; }, /duplicate/],
  ['too many objects', d => { d.objects = Array(17).fill(d.objects[0]); }, /objects/],
  ['too many actions', d => { d.actions = Array(49).fill(d.actions[0]); }, /actions/],
  ['sparse actions', d => { d.actions = new Array(1); }, /sparse/],
  ['unknown object', d => { d.actions[0].object = 'missing'; }, /object/],
  ['unknown condition', d => { d.objects[0].when = { missing: 'held' }; }, /missing/],
  ['invalid value', d => { d.actions[0].check.key = 'imaginary'; }, /key/],
  ['empty effect', d => { d.actions[0].set = {}; }, /set/],
  ['invalid effect', d => { d.actions[0].set.door = 'broken'; }, /door/],
  ['empty goal', d => { d.goal = {}; }, /goal/],
  ['initial completion', d => { d.goal = { door: 'closed' }; }, /initial/],
  ['input mismatch', d => { d.actions[0].answer = 'ABC'; }, /answer/],
  ['unnormalized answer', d => { d.actions[0].input = true; d.actions[0].answer = ' abc '; }, /answer/],
  ['missing hint', d => { d.actions[0].hints.pop(); }, /hints/],
  ['hidden markup field', d => { d.objects[0].html = '<b>x</b>'; }, /html/],
];
for (const [name, mutate, error] of invalid) test(`rejects ${name}`, () => {
  const d = fixture(); mutate(d); assert.throws(() => S.validate(d), error);
});
test('rejects Cartesian explosion before graph exploration', () => {
  const d = fixture();
  d.variables = Array.from({ length: 8 }, (_, n) => ({ id: `v-${n}`, values: ['a','b','c','d','e','f'], initial: 'a' }));
  assert.throws(() => S.validate(d), /state space/);
});
test('success is immutable and terminal actions are harmless', () => {
  const d = fixture(), s = S.initial(d), before = JSON.stringify(s);
  const r = S.transition(d, s, 'leave', null);
  assert.equal(r.ok, true); assert.equal(r.state.door, 'open');
  assert.equal(JSON.stringify(s), before);
  const repeat = S.transition(d, r.state, 'leave', null);
  assert.equal(repeat.code, 'complete'); assert.deepEqual(repeat.state, r.state);
});
test('wrong setup remains an available attempt without revealing success conditions', () => {
  const d = fixture(), s = { key: 'lost', door: 'closed' };
  assert.equal(S.project(d, s, true).objects[0].actions[0].id, 'leave');
  const r = S.transition(d, s, 'leave', null);
  assert.equal(r.code, 'mechanism'); assert.deepEqual(r.state, s);
});
test('unknown or hidden actions cannot bypass availability', () => {
  const d = fixture(), s = S.initial(d);
  assert.equal(S.transition(d, s, 'missing', null).code, 'locked');
  d.objects[0].when = { key: 'lost' };
  assert.equal(S.project(d, s, false).objects.length, 0);
  assert.equal(S.transition(d, s, 'leave', null).code, 'locked');
});
test('input normalization is explicit and invalid or wrong input is a no-op', () => {
  const d = fixture(); d.actions[0].input = true; d.actions[0].answer = 'A2';
  const s = S.initial(d);
  for (const value of [undefined, null, 12, {}, 'wrong', 'x'.repeat(65)]) {
    const r = S.transition(d, s, 'leave', value);
    assert.equal(r.ok, false); assert.deepEqual(r.state, s);
  }
  assert.equal(S.transition(d, s, 'leave', ' a2 ').ok, true);
});
test('invalid states and nonboolean story mode fail', () => {
  const d = fixture();
  for (const s of [null, {}, { key: 'held', door: 'bad' }, { ...S.initial(d), extra: 'x' }]) {
    assert.throws(() => S.project(d, s, true), /state/);
    assert.throws(() => S.transition(d, s, 'leave', null), /state/);
  }
  assert.throws(() => S.project(d, S.initial(d), 'false'), /story/);
});
test('project never reads answers, checks, effects or the worked solution', () => {
  const d = fixture();
  for (const key of ['answer','check','set']) Object.defineProperty(d.actions[0], key, { get() { throw new Error('secret accessed'); } });
  Object.defineProperty(d, 'solution', { get() { throw new Error('solution accessed'); } });
  const v = S.project(d, S.initial(d), true);
  assert.deepEqual(Object.keys(v.objects[0].actions[0]).sort(), ['hints','id','input','label']);
});
test('conditional observations and story modes share the same legal controls', () => {
  const d = fixture(); d.objects[0].observations.push({ when: { key: 'lost' }, text: prose('Empty hook.') });
  assert.deepEqual(S.project(d, S.initial(d), true).objects[0].observations, []);
  const s = { key: 'lost', door: 'closed' };
  for (const mode of [true,false]) assert.deepEqual(S.project(d, s, mode).objects[0].observations, ['Empty hook.']);
});
