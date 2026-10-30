'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker() {
  const messages = [];
  const context = vm.createContext({ console, structuredClone, TextEncoder });
  context.self = context;
  context.postMessage = (message) => messages.push(message);
  for (const name of ['core.js', 'engines.js', 'validator-worker.js'])
    vm.runInContext(fs.readFileSync(require.resolve('../src/' + name), 'utf8'), context);
  return {
    C: context.AlibiCore,
    send(text) {
      context.onmessage({ data: { type: 'scene-draft-import', text } });
      return JSON.parse(JSON.stringify(messages.at(-1)));
    },
  };
}

const h = worker();
const base = JSON.parse(JSON.stringify({ ...h.C.createSceneDraft({ seed: 7 }), authorSeed: 7 }));
// The file shape the Export draft action writes: the answer is removed.
const file = (draft, extra = {}) => {
  const d = structuredClone(draft);
  delete d.solution;
  return JSON.stringify({ format: 'alibi-scene-draft', schema: 1, draft: d, ...extra }, null, 2);
};
const unchanged = /Your current draft is unchanged/;

test('a draft file round-trips to an equal draft with a placeholder answer', () => {
  const r = h.send(file(base));
  assert.equal(r.ok, true, r.error);
  const { solution, ...rest } = r.value;
  const { solution: original, ...expected } = base;
  assert.deepEqual(rest, expected);
  assert.notDeepEqual(solution, original, 'the shared answer is not recovered from the file');
  assert.deepEqual(
    r.value.people.map((p) => solution[p.id]),
    [0, 1, 2, 3, 4],
  );
});

test('an answer carried by a hand-edited file is ignored', () => {
  const r = h.send(JSON.stringify({ format: 'alibi-scene-draft', schema: 1, draft: base }));
  assert.equal(r.ok, true, r.error);
  assert.notDeepEqual(r.value.solution, base.solution);
});

test('an unfinished or unsolvable draft is accepted', () => {
  const clues = [
    { kind: 'row', who: base.people[0].id, value: 0 },
    { kind: 'row', who: base.people[0].id, value: 1 },
  ];
  const draft = { ...base, clues };
  assert.equal(h.C.solveDefinition({ ...draft }, 1).solutions.length, 0);
  const r = h.send(file(draft));
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.value.clues, clues);
  assert.equal(h.send(file({ ...base, clues: [] })).ok, true);
});

test('wrong format, schema, shape or JSON is refused with the draft unchanged', () => {
  const good = JSON.parse(file(base));
  for (const text of [
    JSON.stringify({ ...good, format: 'alibi-pack' }),
    JSON.stringify({ ...good, schema: 2 }),
    JSON.stringify({ draft: good.draft }),
    JSON.stringify(base),
    'null',
    '[]',
  ]) {
    const r = h.send(text);
    assert.equal(r.ok, false, text.slice(0, 40));
    assert.match(r.error, /not an Alibi Scene Maker draft/);
    assert.match(r.error, unchanged);
  }
  for (const draft of [
    null,
    'x',
    [],
    { ...good.draft, type: 'lights' },
    { ...good.draft, people: [] },
  ]) {
    const r = h.send(JSON.stringify({ ...good, draft }));
    assert.equal(r.ok, false);
    assert.match(r.error, unchanged);
  }
  const r = h.send('{not json');
  assert.equal(r.ok, false);
  assert.match(r.error, /not valid JSON/);
  assert.equal(h.send(undefined).ok, false);
});

test('the size cap counts bytes, not characters', () => {
  const limit = 256 * 1024;
  const pad = (n) => file(base, { note: 'é'.repeat(n) });
  const fits = pad(limit / 2 - 4000),
    over = pad(limit / 2);
  assert.ok(Buffer.byteLength(fits) < limit && fits.length < limit);
  assert.ok(Buffer.byteLength(over) > limit);
  assert.equal(h.send(fits).ok, true);
  const r = h.send(over);
  assert.equal(r.ok, false);
  assert.match(r.error, /256 KiB/);
});
