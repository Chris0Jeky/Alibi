'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker() {
  const messages = [];
  const context = vm.createContext({ console, structuredClone });
  context.self = context;
  context.postMessage = (message) => messages.push(message);
  for (const name of ['core.js', 'engines.js', 'validator-worker.js'])
    vm.runInContext(fs.readFileSync(require.resolve('../src/' + name), 'utf8'), context);
  return {
    C: context.AlibiCore,
    send(puzzle) {
      context.onmessage({ data: { type: 'draft', puzzle } });
      return JSON.parse(JSON.stringify(messages.at(-1)));
    },
  };
}

function scene() {
  const ids = ['june', 'miles', 'ada', 'felix', 'ellis'];
  const rows = [0, 2, 3, 4, 1];
  return {
    id: 'comparison-fixture',
    revision: 1,
    type: 'scene',
    size: 5,
    title: 'Two arrangements',
    subtitle: 'Synthetic scene',
    story: 'Every clue is true.',
    difficulty: 'Gentle',
    roomNames: ['Lounge', 'Study', 'Garden'],
    rooms: [...Array(10).fill(0), ...Array(10).fill(1), ...Array(5).fill(2)],
    people: ids.map((id, color) => ({ id, name: id, role: 'Guest', color })),
    victim: 'ellis',
    objects: [],
    clues: [
      ...ids.map((who, i) => ({ kind: 'row', who, value: rows[i] })),
      ...ids.slice(0, 3).map((who, value) => ({ kind: 'col', who, value })),
    ],
    solution: { june: 0, miles: 11, ada: 17, felix: 23, ellis: 9 },
  };
}

test('ambiguous draft returns two valid distinct witnesses without changing the draft', () => {
  const h = worker(),
    p = scene(),
    before = structuredClone(p);
  const result = h.send(p);
  assert.equal(result.ok, true, result.error);
  assert.equal(result.value.solutions.length, 2);
  // Independent oracle: these are the only two permutations of the unfixed columns.
  assert.deepEqual(
    result.value.solutions.sort((a, b) => a.felix - b.felix),
    [
      { june: 0, miles: 11, ada: 17, felix: 23, ellis: 9 },
      { june: 0, miles: 11, ada: 17, felix: 24, ellis: 8 },
    ],
  );
  for (const solution of result.value.solutions)
    assert.doesNotThrow(() => h.C.validateDefinition({ ...p, solution }));
  assert.deepEqual(p, before);
});

test('a resolving clue produces one witness; a contradiction remains unsatisfiable', () => {
  const h = worker(),
    p = scene();
  p.clues.push({ kind: 'col', who: 'felix', value: 3 });
  const unique = h.send(p);
  assert.equal(unique.ok, true, unique.error);
  assert.deepEqual(unique.value.solutions, [p.solution]);
  p.clues.push({ kind: 'col', who: 'felix', value: 4 });
  const impossible = h.send(p);
  assert.equal(impossible.ok, false);
  assert.match(impossible.error, /No solution fits/);
  assert.equal(impossible.value, undefined);
});

test('an unfinished draft without clues can still compare valid arrangements', () => {
  const h = worker(),
    p = scene();
  p.clues = [];
  const result = h.send(p);
  assert.equal(result.ok, true, result.error);
  assert.equal(result.value.solutions.length, 2);
  for (const solution of result.value.solutions)
    assert.equal(h.C.sceneComplete(p, { placements: solution }), true);
  assert.deepEqual(p.clues, []);
});

test('budget exhaustion stays a refusal and never publishes partial witnesses', () => {
  const h = worker(),
    solve = h.C.solveDefinition;
  h.C.solveDefinition = (p, limit, maxNodes) => {
    assert.equal(limit, 2);
    assert.equal(maxNodes, 250000);
    return solve(p, limit, 1);
  };
  const result = h.send(scene());
  assert.equal(result.ok, false);
  assert.match(result.error, /Solver budget exceeded/);
  assert.equal(result.value, undefined);
});

test('invalid solution or clue data is refused instead of shown as a witness', () => {
  const h = worker(),
    p = scene();
  h.C.solveDefinition = () => ({ solutions: [{ ...p.solution, ellis: 0 }] });
  assert.equal(h.send(p).ok, false);
  p.people = null;
  assert.equal(h.send(p).ok, false);
});
