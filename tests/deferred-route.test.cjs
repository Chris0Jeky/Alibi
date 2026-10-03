'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(require.resolve('../src/app.js'), 'utf8');
const start = app.indexOf('  async function loadRoute(');
const end = app.indexOf("  window.addEventListener('hashchange'", start);
const routeSource = app.slice(start, end);
const bodyStart = app.indexOf('  function playPageInner()');
const bodyEnd = app.indexOf('\n  function ', bodyStart + 3);
const pageSource = app.slice(bodyStart, bodyEnd);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const tick = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
function fixture(saved = false) {
  const gate = deferred(),
    renders = [],
    dialogs = [],
    created = [],
    messages = [];
  const puzzle = { id: 'vault-test', revision: 1, size: 2, type: 'binary', title: 'Vault test' };
  const old = { puzzle: { ...puzzle, id: 'old' }, state: {}, elapsed: 4 };
  const run = { puzzle: { ...puzzle, solution: [1, 0, 0, 1] }, state: {}, elapsed: 7 };
  let ready = false,
    requests = 0,
    left = 0;
  const element = { open: false, focus() {} };
  const context = vm.createContext({
    URLSearchParams,
    location: { hash: '#/play/vault-test' },
    document: {
      documentElement: { dataset: {} },
      getElementById() {
        return null;
      },
    },
    window: { scrollTo() {} },
    clearTimeout() {},
    $: () => element,
    closeDialog() {},
    endPaint() {},
    enqueueSave: async () => {},
    find: (id) => (id === puzzle.id ? puzzle : null),
    records: new Map(saved ? [['vault-test@1', run]] : []),
    M: { binary: {} },
    books: [],
    prefs: { seen: ['binary'] },
    range: (n) => Array.from({ length: n }, (_, i) => i),
    enabledCell: () => true,
    keyFor: (p) => p.id + '@' + p.revision,
    esc: String,
    AlibiActivities: {
      leave: async () => {
        left++;
      },
    },
    AlibiClub: { onRoute: async () => {} },
    deferred: {
      has: (p) => p === puzzle && !ready,
      ensure() {
        requests++;
        return gate.promise;
      },
    },
    getRun(p) {
      assert.ok(p.solution, 'never create a run from a listing');
      created.push(p.id);
      return run;
    },
    render() {
      renders.push({
        page: context.route.page,
        id: context.route.id,
        current: context.current,
        left,
      });
    },
    toast: (text) => messages.push(text),
    dialog: (title, body, actions) => dialogs.push({ title, body, actions }),
    revealPlayBoard() {},
    startLesson() {},
    old,
  });
  vm.runInContext(
    `var current=old, route={page:'play',id:'old'}, routeSerial=0, draftEpoch=0,
    dialogOpener=null, bridgeAnchor=null, noteTimer=null, caseReturn=null, sessionSeconds=0,
    selectedCell=0, selectedPerson=null, sceneMarkMode='', pencil=false, brush=1, paused=false,
    checking=false, reviewing=false, feedback='', evidenceTab='', dossierTab=0, zoomed=false,
    accuseChoice=null, trailValue=0, settings={}, practice={}, storageFatal=false, saveError=false,
    routeFocusSerial=0;
    ${routeSource}\n${pageSource}
    this.open=loadRoute; this.pendingPage=()=>{const prior=current;current=null;try{return playPageInner();}finally{current=prior;}};`,
    context,
  );
  return {
    context,
    renders,
    dialogs,
    created,
    messages,
    gate,
    run,
    puzzle,
    requests: () => requests,
    success() {
      Object.assign(puzzle, run.puzzle);
      ready = true;
      gate.resolve();
    },
    fail() {
      gate.reject(Error('offline'));
    },
  };
}
test('a pending deferred route clears the old board and renders after leaving its activity', async () => {
  const f = fixture(),
    pending = f.context.open();
  await tick();
  assert.equal(f.context.current, null);
  assert.equal(f.renders.at(-1)?.page, 'play');
  assert.equal(f.renders.at(-1)?.current, null);
  assert.ok(f.renders.at(-1)?.left > 0);
  assert.equal(f.created.length, 0);
  assert.match(f.context.pendingPage(), /role="status"/);
  assert.match(f.context.pendingPage(), /href="#\/library"/);
  f.success();
  await pending;
  assert.equal(f.context.current, f.run);
});
test('navigation away during a deferred load cannot reopen the old target', async () => {
  const f = fixture(),
    pending = f.context.open();
  await tick();
  f.context.location.hash = '#/home';
  await f.context.open();
  const count = f.renders.length;
  f.success();
  await pending;
  assert.equal(f.context.route.page, 'home');
  assert.equal(f.context.current, null);
  assert.equal(f.renders.length, count);
  assert.deepEqual(f.created, []);
  assert.deepEqual(f.dialogs, []);
});
test('failed definitions return to the library with retry and create no new run', async () => {
  const f = fixture(),
    pending = f.context.open();
  await tick();
  f.fail();
  await pending;
  assert.equal(f.context.route.page, 'library');
  assert.equal(f.context.current, null);
  assert.equal(f.created.length, 0);
  assert.equal(f.dialogs.length, 1);
  assert.equal(f.dialogs[0].actions[0].action, 'open');
});
test('the current saved definition resumes without waiting for a deferred catalogue entry', async () => {
  const f = fixture(true),
    pending = f.context.open();
  await tick();
  assert.equal(f.requests(), 0, 'saved same-revision progress does not need a network load');
  await pending;
  assert.equal(f.context.current, f.run);
});
test('a failed deferred request cannot show a dialog after navigation away', async () => {
  const f = fixture(),
    pending = f.context.open();
  await tick();
  f.context.location.hash = '#/home';
  await f.context.open();
  const count = f.renders.length;
  f.fail();
  await pending;
  assert.equal(f.context.route.page, 'home');
  assert.equal(f.renders.length, count);
  assert.deepEqual(f.dialogs, []);
  assert.deepEqual(f.created, []);
});
test('same-ID return admits only the newest route after a shared definition load', async () => {
  const f = fixture(),
    first = f.context.open();
  await tick();
  f.context.location.hash = '#/home';
  await f.context.open();
  f.context.location.hash = '#/play/vault-test';
  const last = f.context.open();
  await tick();
  f.success();
  await Promise.all([first, last]);
  assert.deepEqual(f.created, ['vault-test']);
  assert.equal(f.context.current, f.run);
  assert.equal(f.context.route.page, 'play');
});
test('an explicitly pinned old revision resumes without downloading the newer listing', async () => {
  const f = fixture(true);
  f.puzzle.revision = 2;
  f.context.location.hash = '#/play/vault-test@1';
  await f.context.open();
  assert.equal(f.requests(), 0);
  assert.equal(f.context.current.puzzle.revision, 1);
  assert.equal(f.context.current, f.run);
});
