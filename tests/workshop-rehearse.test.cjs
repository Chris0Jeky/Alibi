'use strict';
// Issue #828: Rehearse plays a verified draft in memory. app.js cannot run in Node (it awaits a real
// IndexedDB store), so this slices the real play, save, hint, undo and navigation functions out of it
// and runs them against counting doubles. browser_ui.py proves the same journey in a real browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../src/core.js');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const host = fs.readFileSync(path.join(root, 'src/pulseboard-host.js'), 'utf8');
const slice = (from, to) => {
  const start = app.indexOf(from);
  assert.ok(start >= 0, from);
  const end = app.indexOf(to, start);
  assert.ok(end > start, to);
  return app.slice(start, end);
};
const source = [
  slice('  function getRun(p) {', '  function saveLabel()'),
  slice('  function enqueueSave()', '  const channel ='),
  slice('  function concluding(', '  function accusation('),
  slice('  function locked()', '  function sceneMenu('),
  slice('  function checkBoard()', '  async function showHint()'),
  slice('  function revealConfirm()', '  async function reviewRecord()'),
  slice('  async function reviewRecord()', '  function applyReveal()'),
  slice('  function applyReveal()', '  function undo('),
  slice("  channel?.addEventListener('message'", '  function difficulty('),
  slice('  async function cabinetBackup()', '  async function exportBackup()'),
  slice('  function undo(', '  // The next unsolved chapter'),
  slice('  function nextPuzzle()', '  function startLesson('),
].join('\n');
const rehearseCase = slice("      case 'rehearse-draft':", "      case 'export-draft':");
const backCase = slice("      case 'back-to-collection':", "      case 'favorite':");
const plain = (value) => JSON.parse(JSON.stringify(value));
const draftOf = () => ({ ...C.createSceneDraft({ seed: 7 }), authorSeed: 7 });

function fixture({ verified = true, busy = false } = {}) {
  const log = {
    store: [],
    idb: 0,
    local: 0,
    posts: 0,
    events: [],
    nav: [],
    dialogs: [],
    prefs: 0,
    exported: { runs: [], packs: [] },
  };
  const store = new Proxy(
    { mode: 'indexeddb', export: async () => structuredClone(log.exported) },
    {
      get: (target, key) =>
        key in target
          ? target[key]
          : (...args) => (
              log.store.push([String(key), ...args.slice(0, 2)]),
              Promise.resolve({ rev: 1, updatedAt: 'x' })
            ),
    },
  );
  const context = vm.createContext({
    C: { ...C, loadInsights: async () => ({ deduction: () => null, recap: () => [] }) },
    E: C.registry,
    X: C.extras,
    store,
    indexedDB: { open: () => (log.idb++, {}) },
    localStorage: {
      length: 0,
      key: () => null,
      getItem: () => null,
      removeItem() {},
      setItem: () => log.local++,
    },
    ALIBI_CONFIG: { standalone: false },
    Pulseboard: {
      count: () => true,
      track: (event) => (log.events.push(event), true),
      consent: { get: () => ({ counts: true, journeys: true }) },
    },
    document: { readyState: 'complete', querySelector: () => null, addEventListener() {} },
    addEventListener() {},
    AlibiClub: { assistance: () => 'off', projected: (_p, state) => ({ state }) },
    AlibiTheatre: { moment() {} },
    $: () => ({ textContent: '', scrollIntoView() {} }),
    setSaveLabel() {},
    feedbackSound() {},
    render() {},
    toast() {},
    chapterReveal: () => '',
    icon: () => '',
    esc: String,
    solved: (run) => !!run.completedAt,
    validateRun() {},
    dialog: (title, body, actions) => log.dialogs.push({ title, actions }),
    closeDialog() {},
    navigate: (...args) => log.nav.push(args),
    keyFor: (p) => p.id + '@' + p.revision,
    deferred: null,
  });
  vm.runInContext(host, context);
  const draft = draftOf();
  const api = vm.runInContext(
    `(() => {
      let draft = ${JSON.stringify(draft)}, draftVerified = ${verified}, draftBusy = ${busy},
        rehearsal = null, current = null, paused = false, reviewing = false, checking = false,
        feedback = '', updateRequested = false, restoreBusy = false, storageFatal = '', saveError = '', pendingSaves = 0,
        queue = Promise.resolve(), revs = new Map(), acked = new Map(), records = new Map(),
        channel = { postMessage: () => globalThis.__posts++, addEventListener: (_, fn) => (listener = fn) },
        listener = null, sessionSeconds = 3, hintAction = null, draftSave = Promise.resolve(),
        packs = [{}], settings = {}, cfg = { version: 'test' },
        accuseChoice = null, trailValue = 1, route = { page: 'play', id: '', book: '' }, books = [],
        prefs = { seen: [], favorites: [] };
      globalThis.__posts = 0;
      ${source}
      const rehearseAction = async () => { const el = { dataset: {} }; switch ('rehearse-draft') { ${rehearseCase} } };
      const backAction = async () => { const el = { dataset: {} }; switch ('back-to-collection') { ${backCase} } };
      return {
        draft: () => draft, rehearsal: () => rehearsal, current: () => current, records: () => records,
        rehearseAction, backAction, newRun, getRun, savePreferences,
        enter: (run) => { current = run; sessionSeconds = run.elapsed; },
        act, commit, checkBoard, revealConfirm, applyReveal, undo, nextPuzzle, enqueueSave,
        pause: () => { paused = !paused; enqueueSave(); },
        queue: () => queue, posts: () => globalThis.__posts, saveError: () => saveError,
        acked: () => acked, reviewRecord, cabinetBackup,
        broadcast: (data) => listener({ data }),
        setSeconds: (n) => (sessionSeconds = n),
        breakSaves: (fatal) => (fatal ? (storageFatal = 'fatal') : (saveError = 'Disk full')),
      };
    })()`,
    context,
  );
  return { api, log, context, draft };
}

async function play(h) {
  const { api, draft } = h,
    run = api.current(),
    solution = Object.entries(draft.solution);
  for (const [who, cell] of solution.slice(0, 3))
    assert.equal(api.act({ type: 'place', who, cell }), true);
  api.checkBoard();
  api.undo();
  api.undo(true);
  api.revealConfirm(); // Hint: consults the stored solution, then places that step
  api.applyReveal();
  api.pause();
  api.pause();
  for (const [who, cell] of solution)
    if (run.state.placements[who] !== cell) api.act({ type: 'place', who, cell });
  api.act({ type: 'accuse', who: C.murderer(draft, run.state) });
  await api.savePreferences(); // a lesson close or favourite
  await api.queue();
  return run;
}

test('a rehearsal starts, plays, hints and completes with no store, channel, preference or Pulseboard write', async () => {
  const h = fixture(),
    before = structuredClone(h.api.draft());
  await h.api.rehearseAction();
  const run = h.api.rehearsal();
  assert.equal(run.rehearsal, true);
  assert.deepEqual(h.log.nav, [['play', run.key]], 'it routes to the play page for the draft key');
  assert.notEqual(run.puzzle, h.api.draft(), 'the run holds a clone, never the draft itself');
  h.api.enter(run);
  await play(h);
  assert.ok(run.completedAt, 'the rehearsal really reached completion');
  assert.ok(run.moves >= 5 && run.hints >= 1, 'moves and a reveal were made');
  assert.equal(h.log.dialogs.at(-1).actions[0].label, 'Back to the editor');
  assert.deepEqual(h.log.store, [], 'no store method of any kind was called');
  assert.equal(h.log.idb, 0, 'IndexedDB was never opened');
  assert.equal(h.log.local, 0, 'no localStorage write');
  assert.equal(h.api.posts(), 0, 'no cross-tab save message');
  assert.deepEqual(h.log.events, [], 'no Pulseboard event of any kind');
  assert.equal(h.api.records().size, 0, 'no run record was created');
  assert.equal(h.api.saveError(), '');
  assert.deepEqual(plain(h.api.draft()), before, 'the draft is unchanged');
  h.api.backAction();
  h.api.nextPuzzle();
  assert.deepEqual(
    h.log.nav.slice(1),
    [['workshop'], ['workshop']],
    'both exits return to the editor',
  );
  assert.deepEqual(plain(h.api.draft()), before, 'the draft is unchanged after returning');
});

test('control: the same journey on an installed puzzle does write and report, so the doubles can fail', async () => {
  const h = fixture();
  h.api.enter(h.api.getRun(h.api.draft()));
  await play(h);
  assert.ok(
    h.log.store.some(([name]) => name === 'saveRun'),
    'progress is saved',
  );
  assert.ok(
    h.log.store.some(([name]) => name === 'put'),
    'preferences are saved',
  );
  assert.ok(h.api.posts() > 0, 'other tabs are told');
  assert.ok(h.log.events.includes('puzzle.completed'), 'completion is reported');
  assert.equal(h.api.records().size, 1);
});

test('Rehearse needs a verified, idle draft; an unverified or busy one does not start', async () => {
  for (const options of [{ verified: false }, { busy: true }]) {
    const h = fixture(options);
    await h.api.rehearseAction();
    assert.equal(h.api.rehearsal(), null);
    assert.deepEqual(h.log.nav, []);
  }
});

test('the button, its guards and the edit-time disabling are wired like Add & play', () => {
  assert.match(
    app,
    /B\('Rehearse', 'rehearse-draft', 'play', 'secondary', !draftVerified \|\| draftBusy \? 'disabled' : ''\)/,
  );
  assert.match(app, /\[data-action="rehearse-draft"\], \[data-action="export-draft"\]/);
  assert.match(app, /rehearsal = \{ \.\.\.newRun\(draft\), rehearsal: true \}/);
});

test('the route owns the rehearsal: only its own play key keeps it, and a lesson never auto-opens', () => {
  const load = slice('  async function loadRoute(', "  window.addEventListener('hashchange'");
  assert.match(
    load,
    /const rehearsed = rehearsal && \(route\.page !== 'play' \|\| rehearsal\.key !== id\)/,
  );
  assert.match(load, /if \(rehearsed\) rehearsal = null;/);
  assert.match(load, /current = re \? rehearsal : getRun\(p\);/);
  assert.match(load, /current &&\s+!current\.rehearsal &&\s+!prefs\.seen/);
  assert.match(
    load,
    /const re = rehearsal\?\.key === id,\s+p = re\s+\? rehearsal\.puzzle\s+: pinned/,
  );
});

// Issue #854: the installed run of the same draft shares the rehearsal's key.
function install(h, elapsed = 5) {
  const record = h.api.getRun(h.api.draft());
  record.elapsed = elapsed;
  h.api.acked().set(record.key, JSON.stringify(record));
  h.log.exported.runs = [structuredClone(record)];
  return record;
}

test('Rehearse beside an installed run with the same key plays the rehearsal and leaves the record untouched', async () => {
  const h = fixture(),
    record = install(h),
    before = JSON.stringify(record);
  await h.api.rehearseAction();
  const run = h.api.rehearsal();
  assert.equal(run.key, record.key, 'the keys collide, as after Add & play then Back');
  assert.notEqual(run, record, 'the rehearsal is its own object');
  h.api.enter(run);
  await play(h);
  assert.ok(run.completedAt && run.moves >= 5, 'the rehearsal was played to the end');
  assert.equal(h.api.records().size, 1);
  assert.equal(h.api.records().get(record.key), record, 'the installed record is the same object');
  assert.equal(JSON.stringify(record), before, 'and not a byte of it changed');
  assert.deepEqual(h.log.store, [], 'nothing was written');
  assert.equal(h.api.posts(), 0, 'no other tab was told');
});

test('a backup taken during a colliding rehearsal does not stamp its seconds on the installed run', async () => {
  const h = fixture(),
    record = install(h);
  await h.api.rehearseAction();
  h.api.enter(h.api.rehearsal());
  h.api.setSeconds(99);
  const { data, session } = await h.api.cabinetBackup();
  assert.equal(data.runs.length, 1);
  assert.equal(data.runs[0].elapsed, 5, 'the stored elapsed time is kept');
  assert.equal(session, null, 'and the installed run is not reported as diverged');
  // Control: with the installed run itself open its seconds are stamped, so the guard is what differs.
  h.api.enter(record);
  h.api.setSeconds(99);
  assert.equal((await h.api.cabinetBackup()).session.runs[0].elapsed, 99);
});

test('another tab saving the rehearsal key leaves no lock; the same message still locks real play', async () => {
  const h = fixture(),
    record = install(h);
  await h.api.rehearseAction();
  h.api.enter(h.api.rehearsal());
  await h.api.broadcast({ type: 'saved', key: record.key, rev: 5 });
  assert.equal(h.api.saveError(), '', 'no lock for a rehearsal');
  assert.equal(h.api.records().get(record.key), record, 'and the record is not replaced');
  h.api.enter(record);
  const [who, cell] = Object.entries(h.draft.solution)[0];
  assert.equal(
    h.api.act({ type: 'place', who, cell }),
    true,
    'real play afterwards is not blocked',
  );
  await h.api.broadcast({ type: 'saved', key: record.key, rev: 5 });
  assert.match(h.api.saveError(), /another tab/, 'control: the real run is still locked');
});

test('the review-record dialog of a rehearsal returns to the editor', async () => {
  const h = fixture();
  await h.api.rehearseAction();
  const run = h.api.rehearsal();
  h.api.enter(run);
  await play(h);
  await h.api.reviewRecord();
  assert.equal(h.log.dialogs.at(-1).actions[0].label, 'Back to the editor');
  assert.equal(h.log.dialogs.at(-1).actions[0].action, 'next');
  // Control: an installed run still offers another puzzle.
  const real = fixture();
  real.api.enter(real.api.getRun(real.api.draft()));
  await play(real);
  await real.api.reviewRecord();
  assert.equal(real.log.dialogs.at(-1).actions[0].label, 'Another puzzle');
});

for (const fatal of [false, true]) {
  test(`a pre-existing ${fatal ? 'storage failure' : 'save error'} does not block a rehearsal, but still blocks real play`, async () => {
    const h = fixture(),
      [who, cell] = Object.entries(h.draft.solution)[0];
    await h.api.rehearseAction();
    const run = h.api.rehearsal();
    h.api.enter(run);
    h.api.breakSaves(fatal);
    assert.equal(h.api.act({ type: 'place', who, cell }), true, 'rehearsal input is accepted');
    assert.equal(run.state.placements[who], cell);
    h.api.undo();
    assert.notEqual(run.state.placements[who], cell, 'and Undo works');
    assert.deepEqual(h.log.store, [], 'it still wrote nothing');
    // Control: the installed run is refused under the same condition.
    const real = fixture(),
      installed = real.api.getRun(real.api.draft());
    real.api.enter(installed);
    real.api.breakSaves(fatal);
    assert.equal(real.api.act({ type: 'place', who, cell }), false);
    assert.notEqual(installed.state.placements[who], cell);
  });
}
