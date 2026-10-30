'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js'),
  I = require('../src/insights.js');
const { load } = require('../tools/official-catalogue.cjs');
const official = load(path.resolve(__dirname, '..'), false).puzzles;
const hidden = (p) =>
  new Proxy(p, {
    get(target, key) {
      if (key === 'solution') throw Error('Solution consulted');
      return target[key];
    },
  });

test('Alibi file hints are sound and alone complete every official file', () => {
  // Before #846 no Alibi file offered a reasoning hint.
  let steps = 0;
  for (const p of official.filter((q) => q.type === 'dossier')) {
    const n = p.size,
      s = C.registry.dossier.initial(p);
    for (let k = 0; k < 4 * n * n; k++) {
      const h = I.deduction(hidden(p), s);
      if (!h?.mark) break;
      assert.equal(h.value, undefined, 'grid hints never claim a single-cell value');
      const { cell, value } = h.mark,
        cat = Math.floor(cell / (n * n)),
        person = Math.floor((cell % (n * n)) / n);
      assert.equal(
        value,
        p.solution[cat * n + person] === cell % n ? 1 : 0,
        `${p.id}: ${h.message}`,
      );
      s.marks[cell] = value;
      steps++;
    }
    for (let cat = 0; cat < 2; cat++)
      for (let person = 0; person < n; person++)
        assert.equal(s.marks[cat * n * n + person * n + p.solution[cat * n + person]], 1, p.id);
  }
  // Measured 473 steps across 29 files.
  assert.ok(steps >= 450, String(steps));
});

test('an Alibi file clue that contradicts a mark asks for a correction', () => {
  const p = official.find((q) => q.id === 'dossier-01'),
    s = C.registry.dossier.initial(p),
    eq = p.clues.findIndex((cl) => cl.kind === 'eq'),
    cl = p.clues[eq];
  s.marks[cl.cat * p.size * p.size + cl.who * p.size + cl.value] = 0;
  const h = I.deduction(p, s);
  assert.equal(h.rule, 'Revisit a conflict');
  assert.match(h.message, new RegExp(`Clue ${eq + 1} says`));
});

test('a linked clue carries a known room across to the object', () => {
  const p = {
      type: 'dossier',
      size: 2,
      people: ['Ann', 'Bo'],
      categories: [
        { name: 'Room', values: ['hall', 'loft'] },
        { name: 'Object', values: ['map', 'key'] },
      ],
      clues: [{ kind: 'link', a: 0, b: 1 }],
      targetItem: 0,
    },
    s = C.registry.dossier.initial(p);
  s.marks[0] = 1; // Ann was in the hall
  s.marks[3] = 1; // Bo was in the loft (keeps the room grid free of singles)
  const h = I.deduction(p, s);
  assert.equal(h.rule, 'Follow a linked clue');
  assert.deepEqual(h.mark, { cell: 4 + 1, value: 1 });
  assert.match(h.message, /Ann was in the hall, so Ann carried the key/);
});

test('witness hints rule out an innocent person, never the culprit', () => {
  for (const p of official.filter((q) => q.type === 'witness')) {
    const h = I.deduction(hidden(p), C.registry.witness.initial(p));
    assert.equal(h?.rule, 'Test one person', p.id);
    const named = p.people.findIndex((name) => h.message.startsWith(`Suppose ${name} `));
    assert.notEqual(named, p.solution, p.id);
    assert.notEqual(p.statements.filter((c) => C.extras.truth(c, named)).length, p.trueCount, p.id);
  }
});
