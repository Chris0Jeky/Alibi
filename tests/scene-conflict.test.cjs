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

function scene(clues) {
  const ids = ['june', 'miles', 'ada', 'felix', 'ellis'];
  return {
    id: 'conflict-fixture',
    revision: 1,
    type: 'scene',
    size: 5,
    title: 'Conflicting clues',
    subtitle: 'Synthetic scene',
    story: 'Not every clue can be true.',
    difficulty: 'Gentle',
    roomNames: ['Lounge', 'Study', 'Garden'],
    rooms: [...Array(10).fill(0), ...Array(10).fill(1), ...Array(5).fill(2)],
    people: ids.map((id, color) => ({ id, name: id, role: 'Guest', color })),
    victim: 'ellis',
    objects: [],
    clues,
    solution: { june: 0, miles: 11, ada: 17, felix: 23, ellis: 9 },
  };
}

const sat = (h, p, clues = p.clues) => h.C.solveDefinition({ ...p, clues }, 1).solutions.length > 0;

test('contradicting clues are reported as exactly the numbered pair among consistent clues', () => {
  const h = worker(),
    p = scene([
      { kind: 'col', who: 'miles', value: 1 },
      { kind: 'row', who: 'june', value: 0 },
      { kind: 'col', who: 'ada', value: 2 },
      { kind: 'row', who: 'june', value: 1 },
    ]),
    before = structuredClone(p);
  const result = h.send(p);
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.value, { solutions: [], diagnosis: { kind: 'clues', clues: [1, 3] } });
  assert.deepEqual(p, before);
});

test('the reported set is independently unsatisfiable and minimal', () => {
  const h = worker(),
    p = scene([
      { kind: 'row', who: 'june', value: 0 },
      { kind: 'row', who: 'miles', value: 2 },
      { kind: 'col', who: 'ada', value: 2 },
      { kind: 'row', who: 'ada', value: 2 },
      { kind: 'col', who: 'felix', value: 4 },
    ]);
  const { clues } = h.send(p).value.diagnosis;
  assert.deepEqual(clues, [1, 3]);
  const picked = clues.map((i) => p.clues[i]);
  assert.equal(sat(h, p, picked), false);
  for (const skip of clues)
    assert.equal(
      sat(
        h,
        p,
        picked.filter((_, i) => clues[i] !== skip),
      ),
      true,
    );
});

test('a layout with no arrangement is proved without clues, even when clues are present', () => {
  const h = worker(),
    p = scene([{ kind: 'row', who: 'june', value: 0 }]);
  // Five pieces of furniture fill row one, so five people cannot occupy five distinct rows.
  p.objects = [0, 1, 2, 3, 4].map((cell) => ({ kind: 'plant', cell }));
  assert.equal(sat(h, p, []), false, 'independent oracle: the layout itself is impossible');
  assert.deepEqual(h.send(p).value, { solutions: [], diagnosis: { kind: 'layout' } });
  p.clues = [];
  assert.deepEqual(h.send(p).value, { solutions: [], diagnosis: { kind: 'layout' } });
});

test('verification and diagnosis share one 250,000-node ceiling and refuse when it runs out', () => {
  const h = worker(),
    p = scene([
      { kind: 'row', who: 'june', value: 0 },
      { kind: 'row', who: 'june', value: 1 },
      { kind: 'row', who: 'miles', value: 2 },
    ]),
    limits = [],
    costs = [200000, 10, 30000, 30000];
  h.C.solve = (puzzle, state, limit, maxNodes) => {
    limits.push(maxNodes);
    const nodes = costs[limits.length - 1];
    if (nodes > maxNodes) throw Error('Solver budget exceeded. Simplify this puzzle or add clues.');
    return { solutions: limits.length === 2 ? [{}] : [], nodes };
  };
  const result = h.send(p);
  assert.deepEqual(limits, [250000, 50000, 49990, 19990]);
  assert.equal(result.ok, false);
  assert.match(result.error, /Solver budget exceeded/);
  assert.equal(result.value, undefined);
});

test('exhausting the budget during the layout proof also refuses without a guess', () => {
  const h = worker(),
    p = scene([{ kind: 'row', who: 'june', value: 0 }]);
  let calls = 0;
  h.C.solve = () => {
    if (++calls === 1) return { solutions: [], nodes: 250000 };
    throw Error('Solver budget exceeded.');
  };
  const result = h.send(p);
  assert.equal(result.ok, false);
  assert.match(result.error, /Solver budget exceeded/);
  assert.equal(result.value, undefined);
});

test('satisfiable drafts carry no diagnosis', () => {
  const h = worker(),
    p = scene([
      { kind: 'row', who: 'june', value: 0 },
      { kind: 'row', who: 'miles', value: 2 },
      { kind: 'row', who: 'ada', value: 3 },
      { kind: 'row', who: 'felix', value: 4 },
      { kind: 'row', who: 'ellis', value: 1 },
      { kind: 'col', who: 'june', value: 0 },
      { kind: 'col', who: 'miles', value: 1 },
      { kind: 'col', who: 'ada', value: 2 },
      { kind: 'col', who: 'felix', value: 3 },
    ]);
  const result = h.send(p);
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.value, { solutions: [p.solution] });
});
