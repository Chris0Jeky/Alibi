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
    send(puzzle, type = 'audit') {
      context.onmessage({ data: { type, puzzle } });
      return JSON.parse(JSON.stringify(messages.at(-1)));
    },
  };
}

function scene(clues) {
  const ids = ['june', 'miles', 'ada', 'felix', 'ellis'];
  return {
    id: 'audit-fixture',
    revision: 1,
    type: 'scene',
    size: 5,
    title: 'Clue audit',
    subtitle: 'Synthetic scene',
    story: 'Some clues say nothing new.',
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

// Rows and columns of four people pin them; June takes the one square left, so every clue is needed.
const essential = [
  { kind: 'row', who: 'miles', value: 2 },
  { kind: 'col', who: 'miles', value: 1 },
  { kind: 'row', who: 'ada', value: 3 },
  { kind: 'col', who: 'ada', value: 2 },
  { kind: 'row', who: 'felix', value: 4 },
  { kind: 'col', who: 'felix', value: 3 },
  { kind: 'row', who: 'ellis', value: 1 },
  { kind: 'col', who: 'ellis', value: 4 },
];
// June is already forced to the corner, so "on an outside edge" adds nothing.
const redundant = [...essential, { kind: 'edge', who: 'june' }];
const count = (h, p, skip) =>
  h.C.solveDefinition({ ...p, clues: p.clues.filter((_, i) => i !== skip) }, 2).solutions.length;

test('an all-essential unique draft reports no redundant clue', () => {
  const h = worker(),
    p = scene(essential);
  assert.equal(h.C.solveDefinition(p, 2).solutions.length, 1);
  assert.deepEqual(h.send(p), { ok: true, value: { redundant: [] } });
  for (let i = 0; i < p.clues.length; i++)
    assert.equal(count(h, p, i), 2, `independent oracle: clue ${i} is needed`);
});

test('exactly the one removable clue is reported, and the draft is not mutated', () => {
  const h = worker(),
    p = scene(redundant),
    before = structuredClone(p);
  assert.deepEqual(h.send(p), { ok: true, value: { redundant: [8] } });
  assert.deepEqual(p, before);
  const oracle = p.clues.flatMap((_, i) => (count(h, p, i) === 1 ? [i] : []));
  assert.deepEqual(oracle, [8], 'independent oracle agrees');
});

test('the seed-7 Workshop draft needs every clue, and one extra clue is reported with its twins', () => {
  const h = worker(),
    p = h.C.createSceneDraft({ seed: 7 });
  assert.deepEqual(h.send(p).value, { redundant: [] });
  // Browser journey: add "Miles in row 2". It is true, so it is removable; so are clues 3 and 6.
  p.clues.push({ kind: 'row', who: 'person-2', value: 1 });
  assert.deepEqual(h.send(p).value, { redundant: [2, 5, 7] });
});

test('only a draft with exactly one solution can be audited', () => {
  const h = worker(),
    message = 'Verify the draft first; the audit needs exactly one solution.';
  for (const clues of [
    essential.slice(1), // two arrangements fit
    [...essential, { kind: 'row', who: 'june', value: 1 }], // none fits
  ]) {
    const result = h.send(scene(clues));
    assert.equal(result.ok, false);
    assert.equal(result.error, message);
    assert.equal(result.value, undefined);
  }
});

test('the audit uses the same structural checks as verification', () => {
  const h = worker(),
    broken = scene(essential);
  broken.rooms = broken.rooms.map((room, i) => (i === 24 ? 0 : room));
  for (const type of ['draft', 'audit']) {
    assert.match(h.send(broken, type).error, /connected area/);
    assert.match(h.send({ ...scene(essential), size: 4 }, type).error, /Invalid edited scene/);
  }
});

test('one 250,000-node ceiling covers the uniqueness proof and every removal', () => {
  const h = worker(),
    p = scene(essential.slice(0, 3)),
    limits = [],
    costs = [100000, 50000, 40000, 30000];
  h.C.solve = (puzzle, state, limit, maxNodes) => {
    limits.push(maxNodes);
    const nodes = costs[limits.length - 1];
    if (nodes > maxNodes) throw Error('Solver budget exceeded. Simplify this puzzle or add clues.');
    return { solutions: limits.length === 3 ? [{}, {}] : [{}], nodes };
  };
  assert.deepEqual(h.send(p), { ok: true, value: { redundant: [0, 2] } });
  assert.deepEqual(limits, [250000, 150000, 100000, 60000]);
});

test('exhaustion is reported honestly with no partial list', () => {
  const messages = [
    'The audit reached its search limit before checking every clue. No clue was marked.',
  ];
  for (const [costs, calls] of [
    [[250001], 1], // the uniqueness proof alone runs out
    [[100000, 100000, 50001, 1], 3], // runs out part-way through the removals
  ]) {
    const h = worker(),
      p = scene(essential.slice(0, 3));
    let seen = 0;
    h.C.solve = (puzzle, state, limit, maxNodes) => {
      const nodes = costs[seen++];
      if (nodes > maxNodes)
        throw Error('Solver budget exceeded. Simplify this puzzle or add clues.');
      return { solutions: [{}], nodes };
    };
    const result = h.send(p);
    assert.deepEqual(result, { ok: false, error: messages[0] });
    assert.equal(seen, calls);
  }
});

test('a solver failure other than the budget keeps its own message', () => {
  const h = worker();
  h.C.solve = () => {
    throw Error('Solver exploded.');
  };
  assert.equal(h.send(scene(essential)).error, 'Solver exploded.');
});
