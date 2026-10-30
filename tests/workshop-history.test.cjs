'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');
const initial = { ...C.createSceneDraft({ seed: 7 }), authorSeed: 7 };
const app = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || require.resolve('../src/app.js'),
  'utf8',
);
const helpers = app.slice(
  app.indexOf('  async function saveDraft()'),
  app.indexOf('  function clueValues()'),
);
const addClue = app.slice(
  app.indexOf('  function addClue('),
  app.indexOf('  async function install()'),
);
const actions = app.slice(
  app.indexOf("      case 'draft-mode':"),
  app.indexOf("      case 'feedback-report':"),
);
const input = app.slice(
  app.indexOf("  document.addEventListener('input',"),
  app.indexOf("  document.addEventListener('change',"),
);

function fixture(puzzle = initial) {
  const workers = [],
    saves = [],
    events = {},
    notices = [];
  const node = {
    remove() {},
    focus() {},
    scrollIntoView() {},
    disabled: false,
    dataset: {},
    ariaLabel: '',
  };
  const context = {
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
    store: {
      saveDraft: async (value, rev) => {
        saves.push(structuredClone(value));
        return { ...value, rev: rev + 1 };
      },
    },
    inWorker: (message) =>
      new Promise((resolve, reject) =>
        workers.push({ message: structuredClone(message), resolve, reject }),
      ),
    render() {},
    clueValues() {},
    toast: (message) => notices.push(message),
    settings: { reducedMotion: true },
    document: {
      addEventListener: (name, callback) => {
        events[name] = callback;
      },
      querySelector: () => node,
      querySelectorAll: () => [node],
    },
    $: () => node,
  };
  const api = vm.runInNewContext(
    `(() => {
    let draft = initial, draftVerified = true, draftComparison = null, draftConflict = null, draftShowSolution = false,
      draftBusy = false, draftEpoch = 0, draftSave, routeSerial = 0,
      makerEpoch = 0, draftRev = 0, draftStale = null, channel = null, staleDraft = 'Draft changed in another tab.',
      draftUndo = [], draftRedo = [], draftNameEdit = null,
      draftMode = 'room', draftPaint = 0, draftObject = 'plant', updateRequested = false;
    ${helpers}
    ${addClue}
    ${input}
    return {
      state: () => ({draft, draftVerified, draftComparison, draftEpoch, undo: draftUndo.length, redo: draftRedo.length}),
      action: async (a, data = {}) => { const el = {dataset: data}, v = data.value; switch (a) { ${actions} } },
      add: addClue, verify: verifyDraft,
      generate: () => generateDraft({names:'A,B,C,D,E',seed:'7',title:'Case',setting:'House',story:'Story'}),
      object: value => { draftObject = value; },
    };
  })()`,
    context,
  );
  const inputNode = { dataset: { roomName: '0' }, closest: () => false, value: '' };
  return {
    ...api,
    workers,
    saves,
    notices,
    state: () => structuredClone(api.state()),
    name(value) {
      inputNode.value = value;
      events.input({ target: inputNode });
    },
    blur() {
      events.focusout?.({ target: inputNode });
    },
  };
}

test('Undo restores A while B is checking; its late ambiguity result cannot publish or replace history', async () => {
  const h = fixture();
  await h.action('remove-draft-clue', { index: String(initial.clues.length - 1) });
  const edited = h.state().draft,
    pending = h.verify();
  await h.action('undo-draft');
  assert.deepEqual(h.state().draft, initial);
  assert.equal(h.state().draftVerified, false);
  assert.equal(h.state().redo, 1);
  const epoch = h.state().draftEpoch;
  h.workers[0].resolve({ solutions: C.solveDefinition(edited).solutions });
  await pending;
  assert.deepEqual(h.state().draft, initial);
  assert.equal(h.state().draftEpoch, epoch);
  assert.equal(h.state().draftComparison, null);
  assert.equal(h.state().draftVerified, false);
  assert.equal(h.state().redo, 1);
  assert.deepEqual(h.saves.at(-1), { puzzle: initial });
});

test('clues, rooms, furniture and names restore exact snapshots in both directions', async () => {
  const h = fixture(),
    snapshots = [h.state().draft];
  await h.action('remove-draft-clue', { index: '0' });
  snapshots.push(h.state().draft);
  h.add({ ...initial.clues[0], value: initial.clues[0].value ?? initial.clues[0].other });
  snapshots.push(h.state().draft);
  await h.action('draft-paint', { value: String((initial.rooms[0] + 1) % 5) });
  await h.action('draft-cell', { cell: '0' });
  snapshots.push(h.state().draft);
  await h.action('draft-mode', { value: 'furniture' });
  const empty = Array.from({ length: 25 }, (_, i) => i).find(
    (i) => !initial.objects.some((o) => o.cell === i),
  );
  h.object('lamp');
  await h.action('draft-cell', { cell: String(empty) });
  snapshots.push(h.state().draft);
  h.object('none');
  await h.action('draft-cell', { cell: String(empty) });
  snapshots.push(h.state().draft);
  h.name('Garden');
  h.name('Garden room');
  h.blur();
  snapshots.push(h.state().draft);
  for (let i = snapshots.length - 2; i >= 0; i--) {
    await h.action('undo-draft');
    assert.deepEqual(h.state().draft, snapshots[i]);
    assert.equal(h.state().draftVerified, false);
  }
  for (const snapshot of snapshots.slice(1)) {
    await h.action('redo-draft');
    assert.deepEqual(h.state().draft, snapshot);
    assert.deepEqual(h.saves.at(-1), { puzzle: snapshot });
  }
});

test('no-op and refused edits preserve verification, epoch, history and a redo branch', async () => {
  const h = fixture();
  await h.action('draft-paint', { value: String(initial.rooms[0]) });
  await h.action('draft-cell', { cell: '0' });
  h.name(initial.roomNames[0]);
  h.name('   ');
  await h.action('draft-mode', { value: 'furniture' });
  h.object(initial.objects[0].kind);
  await h.action('draft-cell', { cell: String(initial.objects[0].cell) });
  h.object('none');
  const empty = Array.from({ length: 25 }, (_, i) => i).find(
    (i) => !initial.objects.some((o) => o.cell === i),
  );
  await h.action('draft-cell', { cell: String(empty) });
  assert.throws(() => h.add({ kind: 'left', who: 'person0', value: 'person0' }));
  const clue = initial.clues.find((c) =>
    ['room', 'row', 'col', 'edge', 'notEdge'].includes(c.kind),
  );
  assert.throws(() => h.add({ ...clue, value: clue.value ?? '' }), /already present/);
  assert.deepEqual(h.state(), {
    draft: initial,
    draftVerified: true,
    draftComparison: null,
    draftEpoch: 0,
    undo: 0,
    redo: 0,
  });
  assert.equal(h.saves.length, 0);
  const referenced = fixture({
    ...initial,
    clues: [
      ...initial.clues,
      { kind: 'near', who: initial.people[0].id, value: initial.objects[0].cell },
    ],
  });
  await referenced.action('draft-mode', { value: 'furniture' });
  referenced.object('none');
  await referenced.action('draft-cell', { cell: String(initial.objects[0].cell) });
  assert.equal(referenced.state().undo, 0);
  assert.equal(referenced.saves.length, 0);
  assert.match(referenced.notices[0], /Remove the clue/);
  h.name('Garden');
  h.blur();
  await h.action('undo-draft');
  h.name(initial.roomNames[0]);
  h.blur();
  assert.equal(h.state().redo, 1);
  h.name('Library');
  h.blur();
  assert.equal(h.state().redo, 0);
  await h.action('redo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Library');
});

test('only the newest fifty edits remain undoable and empty history does nothing', async () => {
  const h = fixture();
  await h.action('undo-draft');
  await h.action('redo-draft');
  assert.equal(h.saves.length, 0);
  for (let i = 1; i <= 53; i++) {
    h.name('Room ' + i);
    h.blur();
  }
  assert.equal(h.state().undo, 50);
  for (let i = 0; i < 50; i++) await h.action('undo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Room 3');
  await h.action('undo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Room 3');
  assert.equal(h.state().redo, 50);
  for (let i = 0; i < 50; i++) await h.action('redo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Room 53');
});

test('cancelling a room-name session at the cap preserves all fifty exact Undo and Redo steps', async () => {
  const h = fixture(),
    snapshots = [h.state().draft];
  for (let i = 1; i <= 50; i++) {
    h.name('Room ' + i);
    h.blur();
    snapshots.push(h.state().draft);
  }
  for (let i = 0; i < 2; i++) {
    h.name('Temporary name');
    h.name('Room 50');
    h.blur();
    assert.equal(h.state().undo, 50);
    assert.deepEqual(h.saves.at(-1), { puzzle: snapshots[50] });
  }
  for (let i = 49; i >= 0; i--) {
    await h.action('undo-draft');
    assert.deepEqual(h.state().draft, snapshots[i]);
  }
  assert.equal(h.state().undo, 0);
  assert.equal(h.state().redo, 50);
  for (const snapshot of snapshots.slice(1)) {
    await h.action('redo-draft');
    assert.deepEqual(h.state().draft, snapshot);
  }
});

test('cancelling then retyping without blur commits a new capped step', async () => {
  const h = fixture();
  for (let i = 1; i <= 50; i++) {
    h.name('Room ' + i);
    h.blur();
  }
  h.name('Temporary');
  h.name('Room 50');
  assert.equal(h.state().undo, 50);
  h.name('Retyped');
  h.blur();
  assert.equal(h.state().undo, 50);
  await h.action('undo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Room 50');
  for (let i = 49; i >= 1; i--) {
    await h.action('undo-draft');
    assert.equal(h.state().draft.roomNames[0], 'Room ' + i);
  }
  assert.equal(h.state().undo, 0);
  for (let i = 0; i < 50; i++) await h.action('redo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Retyped');
  assert.deepEqual(h.saves.at(-1), { puzzle: h.state().draft });
});

for (const interrupt of ['another edit', 'Undo']) {
  test(`a capped name session interrupted by ${interrupt} cannot coalesce a later name`, async () => {
    const h = fixture();
    for (let i = 1; i <= 50; i++) {
      h.name('Room ' + i);
      h.blur();
    }
    h.name('Before interruption');
    if (interrupt === 'Undo') await h.action('undo-draft');
    else await h.action('remove-draft-clue', { index: '0' });
    const interrupted = h.state().draft;
    h.name('After interruption');
    h.blur();
    const final = h.state().draft;
    assert.equal(h.state().undo, 50);
    await h.action('undo-draft');
    assert.deepEqual(h.state().draft, interrupted);
    for (let i = 0; i < 49; i++) await h.action('undo-draft');
    assert.equal(h.state().undo, 0);
    assert.equal(h.state().draft.roomNames[0], interrupt === 'Undo' ? 'Room 1' : 'Room 3');
    for (let i = 0; i < 50; i++) await h.action('redo-draft');
    assert.deepEqual(h.state().draft, final);
    assert.deepEqual(h.saves.at(-1), { puzzle: final });
  });
}

test('one room-name editing session is one step, including a return to its original value', async () => {
  const h = fixture();
  h.name('G');
  h.name('Garden');
  h.name('Garden room');
  h.blur();
  assert.equal(h.state().undo, 1);
  h.name('Study');
  h.name('Garden room');
  h.blur();
  assert.equal(h.state().undo, 1, 'a net no-op session adds no step');
  h.name('Library');
  h.blur();
  assert.equal(h.state().undo, 2);
  await h.action('undo-draft');
  assert.equal(h.state().draft.roomNames[0], 'Garden room');
  await h.action('undo-draft');
  assert.deepEqual(h.state().draft, initial);
});

test('reverification preserves history; generation keeps the replaced draft on Undo', async () => {
  const h = fixture();
  h.name('Garden');
  h.blur();
  h.name('Library');
  h.blur();
  await h.action('undo-draft');
  const pending = h.verify();
  h.workers[0].resolve({ solutions: [initial.solution] });
  await pending;
  assert.equal(h.state().draftVerified, true);
  assert.equal(h.state().undo, 1);
  assert.equal(h.state().redo, 1);
  const replaced = h.state().draft;
  const generated = h.generate();
  h.workers[1].resolve(C.createSceneDraft({ seed: 8 }));
  await generated;
  assert.equal(h.state().undo, 2, 'the replaced draft joins the existing history');
  assert.equal(h.state().redo, 0);
  assert.equal(h.state().draftVerified, true);
  await h.action('undo-draft');
  assert.deepEqual(h.state().draft, replaced, 'Undo restores the hand-edited draft');
  assert.equal(h.state().redo, 1);
});

test('Redo invalidates a pending unique result and preserves the edited draft', async () => {
  const h = fixture();
  await h.action('remove-draft-clue', { index: String(initial.clues.length - 1) });
  const edited = h.state().draft;
  await h.action('undo-draft');
  const pending = h.verify();
  await h.action('redo-draft');
  h.workers[0].resolve({ solutions: [initial.solution] });
  await pending;
  assert.deepEqual(h.state().draft, edited);
  assert.equal(h.state().draftVerified, false);
  assert.equal(h.state().draftComparison, null);
  assert.equal(h.state().undo, 1);
  assert.equal(h.state().redo, 0);
});

test('clue and furniture capacity refusals do not mutate or consume history', async () => {
  const puzzle = {
    ...initial,
    clues: Array.from({ length: 40 }, () => initial.clues[0]),
    objects: Array.from({ length: 12 }, (_, cell) => ({ cell, kind: 'lamp', name: 'lamp' })),
  };
  const h = fixture(puzzle);
  assert.throws(() => h.add(initial.clues[1]), /40 clues/);
  await h.action('draft-mode', { value: 'furniture' });
  await assert.rejects(h.action('draft-cell', { cell: '24' }), /12 furniture/);
  assert.deepEqual(h.state().draft, puzzle);
  assert.equal(h.state().undo, 0);
  assert.equal(h.state().draftVerified, true);
  assert.equal(h.saves.length, 0);
});

for (const outcome of ['refused', 'malformed', 'stale success', 'stale failure']) {
  test(`generation ${outcome} preserves history without restoring publication`, async () => {
    const h = fixture();
    h.name('Garden');
    h.blur();
    const pending = h.generate();
    if (outcome.startsWith('stale')) await h.action('undo-draft');
    const before = h.state();
    if (outcome.includes('failure') || outcome === 'refused') h.workers[0].reject(Error('refused'));
    else h.workers[0].resolve(outcome === 'malformed' ? {} : C.createSceneDraft({ seed: 7 }));
    if (outcome.startsWith('stale')) await pending;
    else await assert.rejects(pending);
    assert.deepEqual(h.state(), before);
    assert.equal(h.state().draftVerified, false);
  });
}
