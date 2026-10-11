'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ctx = { structuredClone, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8'), ctx);
const RealC = ctx.AlibiCore;

class StubFormData {
  constructor(form) {
    this.fields = form.fields;
  }
  get(k) {
    const v = this.fields[k];
    return v === undefined ? null : v;
  }
}
const formFor = (kind, who, value) => ({ fields: { kind, who, value } });

function addClueSource() {
  const src = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const m = src.match(/function addClue\(form\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 'addClue found in src/app.js');
  return m[0];
}

function makeRunner(draft) {
  let dirty = 0,
    rendered = 0;
  // Neutralise core validation so the test proves addClue validates entry itself.
  const C = {
    validateSceneClue: () => {},
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  };
  const body = `${addClueSource()}\nreturn addClue(form);`;
  const fn = new Function('form', 'draft', 'C', 'dirtyDraft', 'render', 'FormData', body);
  return {
    draft,
    run: (form) =>
      fn(
        form,
        draft,
        C,
        () => {
          dirty += 1;
        },
        () => {
          rendered += 1;
        },
        StubFormData,
      ),
    counts: () => ({ dirty, rendered }),
  };
}

test('crafted room clue with unknown person and out-of-range value throws', () => {
  const draft = RealC.createSceneDraft({ seed: 7 });
  draft.clues = [];
  const r = makeRunner(draft);
  assert.throws(() => r.run(formFor('room', 'not-a-person', '99')));
  assert.equal(draft.clues.length, 0);
});

test('crafted relational clue with the same person throws', () => {
  const draft = RealC.createSceneDraft({ seed: 7 });
  draft.clues = [];
  const r = makeRunner(draft);
  assert.throws(() => r.run(formFor('left', 'person-1', 'person-1')));
  assert.equal(draft.clues.length, 0);
});

test('valid clue still adds', () => {
  const draft = RealC.createSceneDraft({ seed: 7 });
  draft.clues = [];
  const r = makeRunner(draft);
  r.run(formFor('room', 'person-1', '0'));
  assert.equal(draft.clues.length, 1);
  assert.deepEqual(draft.clues[0], { kind: 'room', who: 'person-1', value: 0 });
});
