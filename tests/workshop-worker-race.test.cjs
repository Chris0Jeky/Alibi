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
  source.indexOf('  function recordDraft('),
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
  const calls = { workers: [], saves: [], renders: [], toasts: [], scrolls: [], dialogs: [] };
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
    esc: String,
    dialog: (title, body, actions) => calls.dialogs.push({ title, body, actions }),
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
    let draft = initial, draftVerified = false, draftComparison = null, draftConflict = null, draftAudit = null,
      draftUndo = [], draftRedo = [], draftNameEdit = null,
      draftBusy = false, draftEpoch = 0, makerEpoch = 0, pendingDraft = null, draftShowSolution = true, routeSerial = 0,
      dialogOpener = null, bridgeAnchor = null, noteTimer = null;
    ${workshop}
    ${routeEntry}
    globalThis.state = () => ({ draft, draftVerified, draftBusy, draftEpoch, draftShowSolution, draftComparison, draftConflict, draftAudit });
    globalThis.edit = () => { draft.rooms[0] = 1; dirtyDraft(); };
    globalThis.replace = () => { draft = C.clone(initial); dirtyDraft(); };
    globalThis.markCurrentVerified = () => { draftVerified = true; };
    globalThis.generate = () => generateDraft({ names: 'A,B,C,D,E', seed: '42', title: 'Case', setting: 'House', story: 'Story' });
    globalThis.verify = verifyDraft;
    globalThis.audit = auditDraft;
    globalThis.navigate = loadRoute;
    globalThis.importFile = importDraft;
    globalThis.apply = applyDraftImport;
    globalThis.undo = () => undoDraft();
    globalThis.dropDraft = () => { draft = null; };
    globalThis.set = (v) => { if ('draftBusy' in v) draftBusy = v.draftBusy; if ('draftComparison' in v) draftComparison = v.draftComparison; if ('draftConflict' in v) draftConflict = v.draftConflict; if ('draftAudit' in v) draftAudit = v.draftAudit; };
    globalThis.pending = () => pendingDraft;
    globalThis.undoDepth = () => draftUndo.length;
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

const conflict = { solutions: [], diagnosis: { kind: 'clues', clues: [0, 2] } };

test('a conflict diagnosis is kept as guidance, never verified, saved or marked playable', async () => {
  for (const diagnosis of [conflict.diagnosis, { kind: 'layout' }]) {
    const h = fixture(),
      original = h.context.state().draft;
    h.context.markCurrentVerified();
    const pending = h.context.verify();
    h.worker.resolve({ solutions: [], diagnosis });
    await pending;
    const state = h.context.state();
    // An empty list is a layout-only impossibility; otherwise the numbered clue indices.
    assert.deepEqual(JSON.parse(JSON.stringify(state.draftConflict)), diagnosis.clues || []);
    assert.equal(state.draft, original);
    assert.equal(state.draftVerified, false);
    assert.equal(state.draftComparison, null);
    assert.equal(h.calls.saves.length, 0);
    h.context.edit();
    assert.equal(h.context.state().draftConflict, null, 'an edit invalidates the diagnosis');
  }
});

for (const interrupt of ['edit', 'replace', 'navigate']) {
  test(`a late conflict diagnosis cannot return after ${interrupt}`, async () => {
    const h = fixture(),
      pending = h.context.verify();
    await h.context[interrupt]();
    h.worker.resolve(conflict);
    await pending;
    assert.equal(h.context.state().draftConflict, null);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.calls.toasts.length, 0);
  });
}

for (const interrupt of ['replace', 'navigate', 'generate']) {
  test(`a shown conflict diagnosis is cleared by ${interrupt}`, async () => {
    const h = fixture(),
      pending = h.context.verify();
    h.worker.resolve(conflict);
    await pending;
    assert.ok(h.context.state().draftConflict);
    const next = h.context[interrupt]();
    assert.equal(h.context.state().draftConflict, null);
    if (interrupt === 'generate') {
      h.worker.reject(new Error('stop'));
      await assert.rejects(next);
    } else await next;
  });
}

const count = initial.clues.length;
for (const bad of [
  { solutions: [], diagnosis: null },
  { solutions: [], diagnosis: 'layout' },
  { solutions: [], diagnosis: {} },
  { solutions: [], diagnosis: { kind: 'other', clues: [0] } },
  { solutions: [], diagnosis: { kind: 'clues' } },
  { solutions: [], diagnosis: { kind: 'clues', clues: 0 } },
  { solutions: [], diagnosis: { kind: 'clues', clues: [] } },
  { solutions: [], diagnosis: { kind: 'clues', clues: [1, 1] } },
  { solutions: [], diagnosis: { kind: 'clues', clues: [2, 1] } },
  { solutions: [], diagnosis: { kind: 'clues', clues: [-1, 0] } },
  { solutions: [], diagnosis: { kind: 'clues', clues: [0.5] } },
  { solutions: [], diagnosis: { kind: 'clues', clues: ['0'] } },
  { solutions: [], diagnosis: { kind: 'clues', clues: [0, count] } },
  { diagnosis: { kind: 'layout' } },
  { solutions: [initial.solution], diagnosis: { kind: 'layout' } },
]) {
  test(`malformed conflict diagnosis is refused: ${JSON.stringify(bad)}`, async () => {
    const h = fixture();
    const pending = h.context.verify();
    h.worker.resolve(bad);
    await assert.rejects(pending, /invalid result/);
    assert.equal(h.context.state().draftConflict, null);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.calls.saves.length, 0);
  });
}

function verifiedAudit() {
  const h = fixture();
  h.context.markCurrentVerified();
  return { h, pending: h.context.audit() };
}

test('an audit asks the worker about the verified draft and keeps the answer as guidance only', async () => {
  for (const redundant of [[], [0, 2, count - 1]]) {
    const { h, pending } = verifiedAudit();
    assert.equal(h.context.state().draftBusy, true);
    assert.deepEqual(h.calls.workers, [{ type: 'audit', puzzle: initial }]);
    h.worker.resolve({ redundant });
    await pending;
    const state = h.context.state();
    assert.deepEqual(JSON.parse(JSON.stringify(state.draftAudit)), redundant);
    assert.equal(state.draftBusy, false);
    assert.equal(state.draftVerified, true, 'the audit does not revoke verification');
    assert.equal(h.calls.saves.length, 0);
    assert.equal(h.calls.toasts.length, 0);
    assert.deepEqual(state.draft, initial, 'no clue is ever removed for the author');
  }
});

for (const bad of [
  undefined,
  null,
  {},
  { redundant: null },
  { redundant: 0 },
  { redundant: '0' },
  { redundant: [1, 1] },
  { redundant: [2, 1] },
  { redundant: [-1] },
  { redundant: [0.5] },
  { redundant: ['0'] },
  { redundant: [null] },
  { redundant: [count] },
  { redundant: [0, count + 5] },
  { solutions: [] },
]) {
  test(`a malformed audit reply is refused: ${JSON.stringify(bad)}`, async () => {
    const { h, pending } = verifiedAudit();
    h.worker.resolve(bad);
    await assert.rejects(pending, /clue audit returned an invalid result\. Run it again\./);
    assert.equal(h.context.state().draftAudit, null);
    assert.equal(h.context.state().draftBusy, false);
    assert.equal(h.calls.saves.length, 0);
  });
}

test('a worker refusal shows nothing and leaves no list', async () => {
  const { h, pending } = verifiedAudit();
  h.worker.reject(new Error('The audit reached its search limit.'));
  await assert.rejects(pending, /search limit/);
  assert.equal(h.context.state().draftAudit, null);
  assert.equal(h.context.state().draftVerified, true);
});

test('the audit runs only for a verified draft and never while busy', async () => {
  const h = fixture();
  h.context.audit();
  assert.equal(h.calls.workers.length, 0, 'an unverified draft is not audited');
  h.context.markCurrentVerified();
  const first = h.context.audit();
  h.context.audit();
  assert.equal(h.calls.workers.length, 1, 'a second request while busy is ignored');
  h.worker.resolve({ redundant: [] });
  await first;
  assert.match(
    source,
    /Audit clues', 'audit-draft', '', 'secondary small', !draftVerified \|\| draftBusy \? 'disabled'/,
  );
});

for (const interrupt of ['edit', 'replace', 'navigate']) {
  test(`a late audit cannot return after ${interrupt}`, async () => {
    const { h, pending } = verifiedAudit();
    await h.context[interrupt]();
    h.worker.resolve({ redundant: [0] });
    await pending;
    assert.equal(h.context.state().draftAudit, null);
    if (interrupt !== 'navigate') assert.equal(h.context.state().draftVerified, false);
  });
}

for (const interrupt of ['edit', 'replace', 'navigate', 'verify', 'generate']) {
  test(`a shown audit is cleared by ${interrupt}`, async () => {
    const { h, pending } = verifiedAudit();
    h.worker.resolve({ redundant: [0] });
    await pending;
    assert.ok(h.context.state().draftAudit);
    const next = h.context[interrupt]();
    assert.equal(h.context.state().draftAudit, null);
    if (interrupt === 'verify' || interrupt === 'generate') {
      h.worker.reject(new Error('stop'));
      await assert.rejects(next);
    } else await next;
  });
}

test('the room-name edit path hides the audit and disables its button', () => {
  assert.match(source, /'#draft-comparison, #draft-conflict, #draft-audit'/);
  assert.match(source, /\[data-action="export-draft"\], \[data-action="audit-draft"\]/);
});

for (const failure of ['malformed', 'refused']) {
  test(`${failure} regeneration revokes even a previously verified draft`, async () => {
    const h = fixture();
    h.context.markCurrentVerified();
    const pending = h.context.generate();
    if (failure === 'malformed') h.worker.resolve({ rooms: [] });
    else h.worker.reject(new Error('Worker refused generation'));
    await assert.rejects(pending);
    assert.equal(h.context.state().draftVerified, false);
    assert.equal(h.calls.saves.length, 0);
  });
}

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
    assert.equal(h.context.state().draftVerified, false);
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

// Issue #844: the conflict list links to a clue's remove button, so that button must name its clue,
// and a one-clue conflict must not read as a plural. Both templates run from the real app source.
const slicedSource = (from, to) =>
  source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const helpers = [
  slicedSource('  const B = (label', '  const round = '),
  slicedSource('  const round = ', '  const tool = '),
  slicedSource('  function clueLinks(', '  function draftAuditView()'),
].join('\n');
const eachClue = slicedSource('p.clues.map((cl, i) => `<div class="draft-clue">', "join('')");

test('each clue remove button is named for its clue, so a Clue N link lands on it', () => {
  const html = vm.runInNewContext(`${helpers}; ${eachClue}join('')`, {
    p: { clues: [{}, {}, {}] },
    C: { clueText: () => 'text' },
    esc: String,
    icon: () => '',
  });
  for (const n of [1, 2, 3])
    assert.match(html, new RegExp(`aria-label="Remove clue ${n}" title="Remove clue ${n}"`));
  assert.doesNotMatch(html, /aria-label="Remove clue"/);
  assert.equal(html.match(/data-action="remove-draft-clue"/g).length, 3);
});

test('the conflict heading is singular for one clue, plural for several, layout-only for none', () => {
  const heading = (draftConflict) => {
    const html = vm.runInNewContext(`${helpers}; draftConflictView()`, {
      draftConflict,
      draft: { clues: [{}, {}] },
      C: { clueText: () => 'text' },
      esc: String,
      icon: () => '',
    });
    return html.match(/<h3[^>]*>(.*?)<\/h3>/)[1];
  };
  assert.equal(heading([1]), 'This clue cannot hold with this floor plan');
  assert.equal(heading([0, 1]), 'These clues cannot all hold with this floor plan');
  assert.equal(heading([]), 'No arrangement fits this floor plan, even without clues');
});

// Issue #864: a draft file import is a recorded draft change, never a silent overwrite.
const placeholder = Object.fromEntries(initial.people.map((p, i) => [p.id, i]));
const imported = { ...structuredClone(initial), title: 'Imported draft', solution: placeholder };
const fileOf = (size = 100) => ({ size, text: async () => '{"file":true}' });
const plain = (value) => JSON.parse(JSON.stringify(value));
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

test('replacing an existing draft asks first and changes nothing until confirmed', async () => {
  const h = fixture(),
    original = h.context.state().draft;
  const pending = h.context.importFile(fileOf());
  await settle();
  assert.deepEqual(plain(h.calls.workers), [{ type: 'scene-draft-import', text: '{"file":true}' }]);
  h.worker.resolve(structuredClone(imported));
  await pending;
  assert.equal(h.calls.dialogs.length, 1);
  assert.match(h.calls.dialogs[0].body, /Imported draft/);
  assert.deepEqual(plain(h.calls.dialogs[0].actions.map((a) => a.action)), [
    'replace-draft',
    'close-dialog',
  ]);
  assert.equal(h.context.state().draft, original);
  assert.equal(h.calls.saves.length, 0);
  assert.equal(h.context.undoDepth(), 0);
});

test('a confirmed import goes through Undo, clears every derived result and saves', async () => {
  const h = fixture(),
    original = plain(h.context.state().draft);
  h.context.markCurrentVerified();
  h.context.set({ draftComparison: [{}], draftConflict: [1], draftAudit: [0] });
  const pending = h.context.importFile(fileOf());
  h.worker.resolve(structuredClone(imported));
  await pending;
  h.context.apply();
  const state = h.context.state();
  assert.equal(state.draft.title, 'Imported draft');
  assert.equal(state.draftVerified, false);
  assert.equal(state.draftComparison, null);
  assert.equal(state.draftConflict, null);
  assert.equal(state.draftAudit, null);
  assert.equal(state.draftShowSolution, false);
  assert.equal(h.calls.saves.length, 1);
  assert.equal(h.calls.saves[0].title, 'Imported draft');
  assert.equal(h.context.pending(), null);
  assert.equal(h.context.undoDepth(), 1);
  h.context.undo();
  assert.deepEqual(plain(h.context.state().draft), original);
  assert.equal(h.context.state().draftVerified, false);
});

test('a reply after a newer edit is ignored and a stale confirmation is refused', async () => {
  const h = fixture(),
    pending = h.context.importFile(fileOf());
  h.context.edit();
  const edited = plain(h.context.state().draft);
  h.worker.resolve(structuredClone(imported));
  await pending;
  assert.equal(h.calls.dialogs.length, 0);
  assert.equal(h.context.pending(), null);
  h.context.apply();
  assert.deepEqual(plain(h.context.state().draft), edited);

  const g = fixture(),
    later = g.context.importFile(fileOf());
  g.worker.resolve(structuredClone(imported));
  await later;
  assert.equal(g.calls.dialogs.length, 1);
  g.context.edit();
  const current = plain(g.context.state().draft);
  g.context.apply();
  assert.deepEqual(plain(g.context.state().draft), current);
  assert.equal(g.calls.toasts.at(-1).error, true);
});

test('a reply after leaving the workshop is ignored', async () => {
  const h = fixture(),
    pending = h.context.importFile(fileOf());
  await h.context.navigate();
  h.worker.resolve(structuredClone(imported));
  await pending;
  assert.equal(h.calls.dialogs.length, 0);
  assert.equal(h.context.pending(), null);
});

test('with no draft the import applies at once, unverified', async () => {
  const h = fixture();
  h.context.dropDraft();
  const pending = h.context.importFile(fileOf());
  h.worker.resolve(structuredClone(imported));
  await pending;
  assert.equal(h.calls.dialogs.length, 0);
  assert.equal(h.context.state().draft.title, 'Imported draft');
  assert.equal(h.context.state().draftVerified, false);
  assert.equal(h.calls.saves.length, 1);
});

test('oversize files and a busy editor never reach the worker; refusals leave the draft', async () => {
  const h = fixture(),
    original = h.context.state().draft;
  await assert.rejects(h.context.importFile(fileOf(256 * 1024 + 1)), /256 KiB/);
  h.context.set({ draftBusy: true });
  await h.context.importFile(fileOf());
  assert.equal(h.calls.workers.length, 0);
  h.context.set({ draftBusy: false });
  const pending = h.context.importFile(fileOf());
  h.worker.reject(
    Error('This is not an Alibi Scene Maker draft. Your current draft is unchanged.'),
  );
  await assert.rejects(pending, /not an Alibi Scene Maker draft/);
  assert.equal(h.context.state().draft, original);
  assert.equal(h.calls.dialogs.length + h.calls.saves.length, 0);
  assert.equal(h.context.pending(), null);
});

test('Export draft downloads the draft without its answer, even while unverified', () => {
  const start = source.indexOf("      case 'export-scene-draft':"),
    block = source.slice(start, source.indexOf("      case 'import-draft':", start));
  const downloads = [],
    draft = structuredClone(initial),
    run = (draftBusy) =>
      vm.runInNewContext(`(function () { switch (a) { ${block} } })()`, {
        a: 'export-scene-draft',
        draft,
        draftBusy,
        C,
        download: (...args) => downloads.push(args),
      });
  run(false);
  assert.equal(downloads.length, 1);
  const [name, body] = downloads[0];
  assert.equal(name, `${initial.id}.draft.json`);
  assert.equal(body.format, 'alibi-scene-draft');
  assert.equal(body.schema, 1);
  assert.equal('solution' in body.draft, false);
  assert.equal('authorSeed' in body.draft, false);
  const { solution, authorSeed, ...rest } = initial;
  assert.deepEqual(plain(body.draft), plain(rest));
  assert.ok(draft.solution, 'the stored draft keeps its own answer');
  run(true);
  assert.equal(downloads.length, 1, 'no download while a check is running');
});

test('a room brush beyond the current floor plan paints the last room, never an invalid index', () => {
  const start = source.indexOf("      case 'draft-cell':"),
    block = source.slice(
      start,
      source.indexOf('            const old = draft.objects.find', start),
    );
  assert.ok(start > 0 && block.includes('Math.min(draftPaint'));
  const draft = structuredClone(initial),
    ctx = {
      a: 'draft-cell',
      draft,
      draftMode: 'room',
      draftPaint: 7,
      el: { dataset: { cell: '0' } },
      C,
    };
  // The slice opens the case's if and else blocks; close them, the switch and the function.
  vm.runInNewContext(`(function () { switch (a) { ${block} } } } })()`, ctx);
  assert.equal(draft.rooms[0], draft.roomNames.length - 1);
  assert.equal(ctx.draftPaint, draft.roomNames.length - 1);
  assert.doesNotThrow(() => C.validateSceneDraft(draft));
});

test('the author solution is drawn only when it is real', () => {
  const line = source.split('\n').find((l) => l.includes('draftShowSolution && ('));
  assert.match(line, /draftShowSolution && \(draftVerified \|\| !blankSolution\(p\)\)/);
});
