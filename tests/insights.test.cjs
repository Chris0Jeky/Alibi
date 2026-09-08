'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
require('../src/core.js');
const C = require('../src/engines.js'),
  I = require('../src/insights.js');
const puzzles = require('../content/catalog.json').puzzles;
test('reasoning hints are sound on correct partial boards and never read the solution', () => {
  for (const type of ['sudoku', 'futoshiki', 'binary', 'nonogram']) {
    let count = 0;
    for (const p of puzzles.filter((p) => p.type === type)) {
      const s = C.registry[type].initial(p);
      const hidden = new Proxy(p, {
        get(target, key) {
          if (key === 'solution') throw Error('Solution consulted');
          return target[key];
        },
      });
      const before = structuredClone(s);
      for (let step = 0; step < p.size ** 2; step++) {
        const hint = I.deduction(hidden, s);
        if (!hint || hint.value === undefined) break;
        assert.equal(hint.value, p.solution[hint.cells[0]], p.id + ': ' + hint.message);
        assert.ok(hint.message.includes(String.fromCharCode(65 + (hint.cells[0] % p.size))));
        s.cells[hint.cells[0]] = hint.value;
        count++;
      }
      const untouched = C.registry[type].initial(p);
      I.deduction(hidden, untouched);
      assert.deepEqual(untouched, before, 'requesting a hint does not change the board');
    }
    assert.ok(count > 0, type + ' produces deductions');
  }
});
test('a conflict yields a correction prompt before a deduction', () => {
  const p = puzzles.find((p) => p.type === 'sudoku'),
    s = C.registry.sudoku.initial(p);
  s.cells.fill(1);
  assert.equal(I.deduction(p, s).rule, 'Revisit a conflict');
});
test('mystery recaps follow the completed state and stay hidden for unfinished puzzles', () => {
  const witness = puzzles.find((p) => p.id === 'witness-01');
  const w = C.registry.witness.initial(witness);
  assert.deepEqual(I.recap(witness, w), []);
  w.accused = witness.solution;
  assert.match(I.recap(witness, w)[0], /Mina/);
  assert.match(I.recap(witness, w)[3], /Account 3: true/);
  const scene = puzzles.find((p) => p.id === 'scene-13'),
    s = C.registry.scene.initial(scene);
  s.placements = structuredClone(scene.solution);
  s.accused = C.murderer(scene, s);
  assert.match(I.recap(scene, s).at(-1), /Theo.*6 clues fit/);
  assert.equal(I.recap(scene, s).length, 6);
  const dossier = puzzles.find((p) => p.id === 'dossier-01');
  let d = C.registry.dossier.initial(dossier);
  for (let cat = 0; cat < 2; cat++)
    for (let row = 0; row < dossier.size; row++)
      d = C.registry.dossier.reduce(dossier, d, {
        type: 'mark',
        cell:
          cat * dossier.size ** 2 + row * dossier.size + dossier.solution[cat * dossier.size + row],
        value: 1,
        auto: true,
      });
  d.accused = dossier.solution.slice(dossier.size).indexOf(dossier.targetItem);
  assert.match(I.recap(dossier, d).at(-1), /Mina carried the brass key/);
});
