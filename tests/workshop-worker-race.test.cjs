'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');
const initial = { ...C.createSceneDraft({ seed: 7 }), authorSeed: 7 };
const reply = (operation) =>
  operation === 'generate' ? structuredClone(initial) : { solutions: [initial.solution] };

const source = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || require.resolve('../src/app.js'),
  'utf8',
);
const workshop = source.slice(
  source.indexOf('  function dirtyDraft()'),
  source.indexOf('  function clueValues()'),
);
// Execute the real route entry through its first await. The rest of routing is
// unrelated to the worker race; invalidation must already happen at entry.
const routeEntry =
  source.slice(
    source.indexOf('  async function loadRoute('),
    source.indexOf('    const raw = location.hash', source.indexOf('  async function loadRoute(')),
  ) + '\n  }';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture({ holdSave = false, puzzle = initial } = {}) {
  const worker = deferred(),
    persistence = deferred(),
    saveStarted = deferred();
  const calls = { workers: [], saves: [], renders: [], toasts: [], scrolls: [] };
  const context = vm.createContext({
    C,
    initial: structuredClone(puzzle),
    FormData: class {
      constructor(form) {
        this.form = form;
      }
      get(key) {
        return this.form[key];
      }
    },
    settings: { reducedMotion: false },
    document: {
      documentElement: { dataset: {} },
      querySelector: () => ({
        scrollIntoView: (options) => calls.scrolls.push(options),
        focus() {},
      }),
    },
    location: { hash: '#/workshop' },
    $: () => ({ open: false }),
    closeDialog() {},
    endPaint() {},
    clearTimeout() {},
    enqueueSave: async () => {},
    inWorker(message) {
      calls.workers.push(structuredClone(message));
      return worker.promise;
    },
    saveDraft() {
      calls.saves.push(structuredClone(context.state().draft));
      saveStarted.resolve();
      return holdSave ? persistence.promise : Promise.resolve();
    },
    render() {
      calls.renders.push(structuredClone(context.state()));
    },
    toast(message, error) {
      calls.toasts.push({ message, error });
    },
  });
  vm.runInContext(
    `
    let draft = initial, draftVerified = false, draftComparison = null,
      draftBusy = false, draftEpoch = 0, draftShowSolution = true, routeSerial = 0,
      dialogOpener = null, bridgeAnchor = null, noteTimer = null;
    ${workshop}
    ${routeEntry}
    globalThis.state = () => ({ draft, draftVerified, draftBusy, draftEpoch, draftShowSolution, draftComparison });
    globalThis.edit = () => { draft.rooms[0] = 1; dirtyDraft(); };
    globalThis.replace = () => { draft = C.clone(initial); dirtyDraft(); };
    globalThis.markCurrentVerified = () => { draftVerified = true; };
    globalThis.generate = () => generateDraft({ names: 'A,B,C,D,E', seed: '42', title: 'Case', setting: 'House', story: 'Story' });
    globalThis.verify = verifyDraft;
    globalThis.navigate = loadRoute;
  `,
    context,
    { filename: 'workshop-app-fixture.js' },
  );
  return { context, calls, worker, persistence, saveStarted };
}

test('comparison preserves the draft and never marks it playable or saves a witness', async () => {
  const puzzle = { ...initial, clues: [] },
    solutions = C.solveDefinition(puzzle).solutions,
    h = fixture({ puzzle });
  const original = h.context.state().draft;
  const pending = h.context.verify();
  h.worker.resolve({ solutions });
  await pending;
  assert.equal(h.context.state().draft, original);
  assert.deepEqual(h.context.state().draft.clues, []);
  assert.equal(h.context.state().draftVerified, false);
  assert.equal(h.context.state().draftShowSolution, false);
  assert.equal(h.context.state().draftComparison.length, 2);
  assert.equal(h.calls.saves.length, 0);
  h.context.edit();
  assert.equal(h.context.state().draftComparison, null);
});

for (const interrupt of ['edit', 'replace', 'navigate']) {
  test(`a late comparison cannot return after ${interrupt}`, async () => {
    const puzzle = { ...initial, clues: [] },
      h = fixture({ puzzle });
    const pending = h.context.verify();
    await h.context[interrupt]();
    const current = h.context.state().draft;
    h.worker.resolve({ solutions: C.solveDefinition(puzzle).solutions });
    await pending;
    assert.equal(h.context.state().draft, current);
    assert.equal(h.context.state().draftComparison, null);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.calls.toasts.length, 0);
  });
}

for (const value of [
  null,
  {},
  initial,
  { solutions: [] },
  { solutions: [initial.solution, initial.solution] },
  { solutions: [initial.solution, initial.solution, initial.solution] },
  { solutions: [{ ...initial.solution, victim: 99 }] },
  { solutions: [initial.solution, {}] },
]) {
  test(`malformed draft reply cannot enable publication: ${JSON.stringify(value)}`, async () => {
    const h = fixture();
    h.context.markCurrentVerified();
    const pending = h.context.verify();
    assert.equal(h.context.state().draftVerified, false, 'rechecking revokes the old result');
    h.worker.resolve(value);
    await assert.rejects(pending);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.context.state().draftComparison, null);
    assert.equal(h.calls.saves.length, 0);
  });
}

test('a malformed generated draft cannot enable publication', async () => {
  const h = fixture(),
    pending = h.context.generate();
  h.worker.resolve({ rooms: [] });
  await assert.rejects(pending);
  assert.equal(h.context.state().draftVerified, false);
  assert.equal(h.calls.saves.length, 0);
});

for (const operation of ['generate', 'verify']) {
  test(`${operation}: a current worker result is persisted and confirmed`, async () => {
    const h = fixture();
    const pending = h.context[operation]();
    assert.equal(h.context.state().draftBusy, true);
    assert.equal(h.calls.workers[0].type, operation === 'generate' ? 'generate' : 'draft');
    h.worker.resolve(reply(operation));
    await pending;
    assert.deepEqual(Array.from(h.context.state().draft.rooms), initial.rooms);
    assert.equal(h.context.state().draftVerified, true);
    assert.equal(h.context.state().draftBusy, false);
    assert.equal(h.calls.saves.length, 1);
    if (operation === 'generate') {
      assert.equal(h.context.state().draft.authorSeed, 42);
      assert.equal(h.context.state().draftShowSolution, false);
      assert.equal(h.calls.scrolls.length, 1);
      assert.deepEqual(Array.from(h.calls.workers[0].options.names), ['A', 'B', 'C', 'D', 'E']);
    } else {
      assert.equal(h.context.state().draft.authorSeed, 7);
      assert.equal(h.context.state().draftShowSolution, true);
      assert.equal(h.calls.toasts.length, 1);
    }
  });

  test(`${operation}: an in-place edit survives a pending worker success`, async () => {
    const h = fixture();
    const original = h.context.state().draft;
    const pending = h.context[operation]();
    h.context.edit();
    h.worker.resolve(reply(operation));
    await pending;
    assert.equal(h.context.state().draft, original);
    assert.deepEqual(Array.from(original.rooms), [1, ...initial.rooms.slice(1)]);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.calls.saves.length, 1, 'only the edit is saved');
    assert.equal(h.calls.saves[0].rooms[0], 1);
    assert.equal(h.calls.toasts.length + h.calls.scrolls.length, 0);
    assert.equal(h.context.state().draftBusy, false);
    assert.equal(h.calls.renders.at(-1).draft.rooms[0], 1);
  });

  test(`${operation}: route entry invalidates a pending success`, async () => {
    const h = fixture();
    const original = h.context.state().draft;
    const pending = h.context[operation]();
    await h.context.navigate();
    h.worker.resolve(reply(operation));
    await pending;
    assert.equal(h.context.state().draft, original);
    assert.equal(h.calls.saves.length, 0);
    assert.equal(h.calls.toasts.length + h.calls.scrolls.length, 0);
    assert.equal(h.context.state().draftBusy, false);
  });

  test(`${operation}: stale rejection leaves the current verification state alone`, async () => {
    const h = fixture();
    const pending = h.context[operation]();
    h.context.edit();
    h.context.markCurrentVerified();
    h.worker.reject(new Error('old worker error'));
    await pending;
    assert.equal(h.context.state().draftVerified, true);
    assert.equal(h.context.state().draft.rooms[0], 1);
    assert.equal(h.calls.toasts.length, 0);
    assert.equal(h.context.state().draftBusy, false);
  });

  test(`${operation}: a current rejection still reaches the error handler`, async () => {
    const h = fixture();
    h.context.markCurrentVerified();
    const pending = h.context[operation]();
    const error = new Error('current worker error');
    h.worker.reject(error);
    await assert.rejects(pending, (caught) => caught === error);
    assert.equal(h.context.state().draftVerified, operation === 'generate');
    assert.equal(h.context.state().draftBusy, false);
    assert.equal(h.calls.saves.length, 0);
  });

  test(`${operation}: an edit during persistence suppresses late success UI`, async () => {
    const h = fixture({ holdSave: true });
    const pending = h.context[operation]();
    h.worker.resolve(reply(operation));
    await h.saveStarted.promise;
    assert.equal(h.calls.saves.length, 1);
    h.context.edit();
    h.persistence.resolve();
    await pending;
    assert.deepEqual(Array.from(h.context.state().draft.rooms), [1, ...initial.rooms.slice(1)]);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.calls.saves.length, 2);
    assert.equal(h.calls.toasts.length + h.calls.scrolls.length, 0);
    assert.equal(h.context.state().draftBusy, false);
    assert.equal(h.calls.renders.at(-1).draft.rooms[0], 1);
  });
}
