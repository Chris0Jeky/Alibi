'use strict';
// Storage contract fixtures only. This is NOT a real browser IndexedDB test.
const fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  checks = [];
const check = (ok, label) => {
  assert.ok(ok, label);
  checks.push(label);
};
const blockIntegration = fs.readFileSync(
  path.join(root, 'src/block-cabinet/integration.mjs'),
  'utf8',
);
check(
  blockIntegration.includes('await club().flush();'),
  'Block Cabinet integration flushes the Club queue after actions',
);
check(
  !blockIntegration.includes('await club().save();'),
  'Block Cabinet integration does not enqueue a duplicate Club CAS write',
);
function store() {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}
async function tab(storage) {
  const c = {
    console,
    URL,
    URLSearchParams,
    Math,
    Date,
    JSON,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: storage,
    location: { hash: '' },
    document: {
      addEventListener() {},
      createElement() {
        return {};
      },
      getElementById() {
        return null;
      },
      body: { append() {} },
    },
  };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src/' + f + '.js'), 'utf8'), c);
  await c.AlibiClub.init({ toast() {}, render() {}, settings: () => ({}) });
  return c;
}
(async () => {
  const s = store(),
    a = await tab(s);
  const pendingSave = a.AlibiClub.save();
  check(typeof pendingSave?.then === 'function', 'Club save exposes an awaitable completion');
  await pendingSave;
  check(
    a.AlibiClub.diagnostics().storageMode === 'local',
    'Falls back to local storage when IndexedDB is unavailable',
  );
  check(
    [...s.data.keys()].join(',') === 'alibi-afterhours-v1',
    'Games Room fallback uses one origin-scoped save key',
  );
  check(
    !s.data.has('alibi-afterhours-v1:recovery'),
    'Games Room fallback does not invent an IndexedDB recovery key',
  );
  check(a.AlibiClub.diagnostics().hero === 0, 'First visit starts with first edition');
  const b = await tab(s);
  check(b.AlibiClub.diagnostics().hero === 1, 'A new tab load rotates to next edition');
  check(b.AlibiClub.diagnostics().state.visit === 2, 'Visit number persists');
  await b.AlibiClub.onRoute({ page: 'home' });
  check(b.AlibiClub.diagnostics().hero === 1, 'Navigation does not rotate edition');
  await b.AlibiClub.action({ dataset: { action: 'club-pin' } });
  await b.AlibiClub.save();
  const c = await tab(s);
  check(c.AlibiClub.diagnostics().hero === 1, 'Pinned edition survives a new load');
  await c.AlibiClub.action({ dataset: { action: 'club-pin' } });
  await c.AlibiClub.save();
  const d = await tab(s);
  check(d.AlibiClub.diagnostics().hero === 2, 'Unpinning resumes rotation on the next visit');
  await a.AlibiClub.action({ dataset: { action: 'club-assist', value: 'tidy' } });
  await a.AlibiClub.save();
  check(
    a.AlibiClub.diagnostics().saveError.includes('another tab'),
    'Older session detects sequential revision conflict',
  );
  check(
    JSON.parse(s.getItem('alibi-afterhours-v1')).data.settings.assist === 'off',
    'Conflicting old save does not overwrite newer preferences',
  );
  const raw = s.getItem('alibi-afterhours-v1');
  const bad = JSON.parse(raw);
  bad.data.schema = 99;
  s.setItem('alibi-afterhours-v1', JSON.stringify(bad));
  const preserved = s.getItem('alibi-afterhours-v1'),
    future = await tab(s);
  check(
    future.AlibiClub.diagnostics().saveError.includes('untouched'),
    'Future schema warns and is preserved',
  );
  check(
    s.getItem('alibi-afterhours-v1') === preserved,
    'Future-version envelope is not replaced by initial visit write',
  );
  s.setItem('alibi-afterhours-v1', '{broken');
  const corrupt = await tab(s);
  check(s.getItem('alibi-afterhours-v1') === '{broken', 'Malformed JSON remains untouched');
  check(
    corrupt.AlibiClub.diagnostics().storageMode === 'session',
    'Unreadable save switches new work to temporary session',
  );
  const ps = store(),
    writer = await tab(ps);
  await writer.AlibiClub.save();
  ps.setItem('alibi-afterhours-v1', '{broken');
  await writer.AlibiClub.save();
  check(
    writer.AlibiClub.diagnostics().saveError.includes('could not be read'),
    'Corrupt fallback surfaces a plain-language persist error',
  );
  check(
    ps.getItem('alibi-afterhours-v1') === '{broken',
    'Failed persist does not overwrite the unreadable record',
  );
  const denied = {
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('denied');
    },
    removeItem() {},
  };
  const temp = await tab(denied);
  check(
    temp.AlibiClub.diagnostics().storageMode === 'session',
    'Unavailable storage has explicit session mode',
  );
  check(
    temp.AlibiClub.diagnostics().saveError.includes('only in this tab'),
    'Session-only warning is exposed',
  );
  const clubSource = fs.readFileSync(path.join(root, 'src/club.js'), 'utf8');
  check(
    /VersionError[\s\S]*\|\|\s*db/.test(clubSource),
    'Unknown IndexedDB read stays protected instead of falling back (source guard)',
  );
  check(
    clubSource.includes('__clubReset === intent'),
    'Delayed borough confirmation only consumes its own reset intent (source guard)',
  );
  async function tabWith(storage, extra = {}, bridgeExtra = {}) {
    const dialogs = [];
    const c = {
      console,
      URL,
      URLSearchParams,
      Math,
      Date,
      JSON,
      Number,
      Promise,
      setTimeout,
      clearTimeout,
      localStorage: storage,
      location: { hash: '' },
      document: {
        addEventListener() {},
        createElement() {
          return {};
        },
        body: { append() {} },
      },
      ...extra,
    };
    c.globalThis = c;
    vm.createContext(c);
    for (const f of ['core', 'backup-validation', 'club-engines', 'club'])
      vm.runInContext(fs.readFileSync(path.join(root, 'src/' + f + '.js'), 'utf8'), c);
    await c.AlibiClub.init({
      toast() {},
      render() {},
      settings: () => ({}),
      dialog(title, body, actions) {
        dialogs.push({ title, body, actions });
      },
      navigate() {},
      ...bridgeExtra,
    });
    c.__capturedDialogs = dialogs;
    return c;
  }
  function abortingIndexedDB() {
    const abortError = Object.assign(Error('Club storage transaction aborted.'), {
      name: 'AbortError',
    });
    const listeners = { complete: [], error: [], abort: [] };
    const tx = {
      error: abortError,
      onabort: null,
      abort() {},
      addEventListener(type, fn) {
        (listeners[type] = listeners[type] || []).push(fn);
      },
      objectStore() {
        return {
          get() {
            const req = { result: undefined, error: abortError, onsuccess: null, onerror: null };
            setTimeout(() => {
              for (const fn of listeners.error || []) {
                try {
                  fn();
                } catch {}
              }
              if (typeof req.onerror === 'function') req.onerror();
            }, 0);
            return req;
          },
        };
      },
    };
    const dbStub = {
      close() {},
      transaction() {
        return tx;
      },
      onversionchange: null,
    };
    return {
      open() {
        const req = {
          result: dbStub,
          error: null,
          onsuccess: null,
          onerror: null,
          onblocked: null,
          onupgradeneeded: null,
          transaction: null,
        };
        setTimeout(() => {
          if (typeof req.onsuccess === 'function') req.onsuccess();
        }, 0);
        return req;
      },
    };
  }
  const unknownStore = store();
  const unknownTab = await tabWith(unknownStore, { indexedDB: abortingIndexedDB() });
  check(
    unknownTab.AlibiClub.diagnostics().storageMode === 'session',
    'Aborted IndexedDB read never switches to writable localStorage',
  );
  check(
    /export/i.test(unknownTab.AlibiClub.diagnostics().saveError) &&
      /reload|temporary/i.test(unknownTab.AlibiClub.diagnostics().saveError) &&
      /untouched/i.test(unknownTab.AlibiClub.diagnostics().saveError),
    'Aborted IndexedDB read warns to export and reload without touching saves',
  );
  check(
    unknownStore.getItem('alibi-afterhours-v1') === null,
    'Aborted IndexedDB read writes no divergent localStorage save',
  );
  await unknownTab.AlibiClub.save();
  check(
    unknownStore.getItem('alibi-afterhours-v1') === null,
    'Temporary session persist does not create a divergent save',
  );
  const raceStore = store();
  const seedTab = await tab(raceStore);
  await seedTab.AlibiClub.save();
  const envelope = JSON.parse(raceStore.getItem('alibi-afterhours-v1'));
  const firstEmpty = seedTab.AlibiClubEngines.borough
    .initial('EVENING-01')
    .board.findIndex((v) => !v);
  envelope.data.runs.borough = {
    seed: 'EVENING-01',
    log: [{ slot: 0, cell: firstEmpty }],
    redo: [],
  };
  raceStore.setItem('alibi-afterhours-v1', JSON.stringify(envelope));
  const raceTab = await tabWith(raceStore);
  check(
    (raceTab.AlibiClub.diagnostics().state.runs.borough?.log.length || 0) === 1,
    'Shared-town fixture starts with an unfinished borough',
  );
  const pendingTimers = [];
  raceTab.setTimeout = (fn, ms) => {
    pendingTimers.push({ fn, ms });
    return pendingTimers.length;
  };
  raceTab.location.hash = '#/salon/borough?seed=SHARED-01';
  await raceTab.AlibiClub.onRoute({ page: 'salon', id: 'borough' });
  check(
    pendingTimers.length === 1 && pendingTimers[0].ms === 100,
    'Shared-town confirmation is deferred without real scheduler sleep',
  );
  const boroughIntent = raceTab.__clubReset;
  check(
    boroughIntent && boroughIntent.id === 'borough' && boroughIntent.seed === 'SHARED-01',
    'Shared-town route creates a borough reset intent',
  );
  raceTab.__clubReset = { id: 'duel', mode: 'local' };
  pendingTimers[0].fn();
  check(
    raceTab.__capturedDialogs.length === 0,
    'Stale shared-town callback is harmless after another reset supersedes it',
  );
  check(
    raceTab.__clubReset.id === 'duel',
    'Stale callback does not replace the superseding intent',
  );
  raceTab.__capturedDialogs.length = 0;
  pendingTimers.length = 0;
  raceTab.location.hash = '#/salon/borough?seed=OTHER-02';
  await raceTab.AlibiClub.onRoute({ page: 'salon', id: 'borough' });
  const freshIntent = raceTab.__clubReset;
  pendingTimers[0].fn();
  check(
    raceTab.__capturedDialogs.length === 1 &&
      /shared town/i.test(raceTab.__capturedDialogs[0].title),
    'Unsuperseded shared-town confirmation still prompts',
  );
  check(raceTab.__clubReset === freshIntent, 'Unsuperseded confirmation keeps its own intent');
  raceTab.__capturedDialogs.length = 0;
  pendingTimers.length = 0;
  raceTab.location.hash = '#/salon/borough?seed=THIRD-03';
  await raceTab.AlibiClub.onRoute({ page: 'salon', id: 'borough' });
  raceTab.location.hash = '#/salon/duel';
  pendingTimers[0].fn();
  check(
    raceTab.__capturedDialogs.length === 0,
    'Shared-town confirmation stays hidden once the URL has left that town',
  );
  const restoreAt = clubSource.indexOf("a === 'restore-confirm'");
  check(restoreAt !== -1, 'Club restore-confirm path exists');
  const restoreEnd = clubSource.indexOf("else if (a === 'duel-mode'", restoreAt);
  const restoreBlock = clubSource.slice(restoreAt, restoreEnd);
  const persistAt = restoreBlock.indexOf('await persist(next)');
  check(persistAt !== -1, 'Restore persists the replacement save');
  check(restoreBlock.includes('botJob++'), 'Restore invalidates the pending keeper job');
  check(
    restoreBlock.includes('botWorker?.terminate()'),
    'Restore terminates the pending keeper worker',
  );
  check(restoreBlock.includes('botWorker = null'), 'Restore clears the keeper worker');
  check(restoreBlock.includes('botPending = false'), 'Restore clears the keeper pending flag');
  check(
    restoreBlock.indexOf('botJob++') < persistAt &&
      restoreBlock.indexOf('botWorker?.terminate()') < persistAt &&
      restoreBlock.indexOf('botWorker = null') < persistAt &&
      restoreBlock.indexOf('botPending = false') < persistAt,
    'Restore cancels the keeper before persisting the replacement',
  );
  check(
    restoreBlock.includes("storageMode !== 'indexeddb'") && restoreBlock.includes('saveError'),
    'Restore keeps the healthy-storage and saveError guards',
  );
  check(
    persistAt < restoreBlock.indexOf('state = next'),
    'Restore keeps persist-then-replace recovery ordering',
  );
  check(
    clubSource.includes("a === 'reset-confirm'") && clubSource.includes('botJob++'),
    'Reset keeper invalidation remains intact',
  );
  console.log(
    'NOTE browser-only boundary: Node has no Worker/IndexedDB interleaving, so this is a source-contract guard that a late keeper reply is ignored after restore begins.',
  );
  // Commit-game contract through the public Club action path. Same VM +
  // localStorage boundary as above: no real IndexedDB or browser durability.
  const gs = store(),
    g = await tab(gs);
  await g.AlibiClub.onRoute({ page: 'salon', id: 'tictactoe' });
  check(
    Array.isArray(g.AlibiClub.diagnostics().state.runs.tictactoe?.log) &&
      g.AlibiClub.diagnostics().state.runs.tictactoe.log.length === 0 &&
      g.AlibiClub.diagnostics().state.runs.tictactoe.redo.length === 0,
    'Tic-Tac-Toe starts with an empty move log and redo stack',
  );
  await g.AlibiClub.action({ dataset: { action: 'club-tictactoe-cell', cell: '0' } });
  await g.AlibiClub.flush();
  check(
    JSON.stringify(g.AlibiClub.diagnostics().state.runs.tictactoe.log) === '[0]' &&
      g.AlibiClub.diagnostics().state.runs.tictactoe.redo.length === 0,
    'Club action records one Tic-Tac-Toe move exactly once with empty redo',
  );
  await g.AlibiClub.action({ dataset: { action: 'club-undo', id: 'tictactoe' } });
  await g.AlibiClub.flush();
  check(
    g.AlibiClub.diagnostics().state.runs.tictactoe.log.length === 0 &&
      JSON.stringify(g.AlibiClub.diagnostics().state.runs.tictactoe.redo) === '[0]',
    'Undo parks the committed move on the redo stack',
  );
  await g.AlibiClub.action({ dataset: { action: 'club-tictactoe-cell', cell: '1' } });
  await g.AlibiClub.flush();
  const after = g.AlibiClub.diagnostics().state.runs.tictactoe;
  check(
    JSON.stringify(after.log) === '[1]' && after.redo.length === 0,
    'A new Club move replaces redo history and is recorded exactly once',
  );
  const persisted = JSON.parse(gs.getItem('alibi-afterhours-v1'));
  check(
    JSON.stringify(persisted.data.runs.tictactoe.log) === '[1]' &&
      persisted.data.runs.tictactoe.redo.length === 0,
    'Committed Tic-Tac-Toe move persists in the localStorage envelope after flush',
  );
  const reloaded = await tab(gs);
  check(
    JSON.stringify(reloaded.AlibiClub.diagnostics().state.runs.tictactoe.log) === '[1]' &&
      reloaded.AlibiClub.diagnostics().state.runs.tictactoe.redo.length === 0,
    'Reloaded tab replays the committed move log with cleared redo',
  );
  fs.writeFileSync(
    path.join(root, 'tests/club-storage-results.json'),
    JSON.stringify(
      {
        passed: true,
        assertions: checks.length,
        scope:
          'Separate Node VM sessions sharing a localStorage fixture. Tests fallback, rotation, pinning, conflicts, unknown IndexedDB reads, reset-intent races, restore keeper invalidation and one Tic-Tac-Toe commitGame contract. Not real IndexedDB transactions, Worker interleaving or browser durability.',
        checks,
      },
      null,
      2,
    ),
  );
  console.log('PASS ' + checks.length + ' Club storage / visit contract assertions.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
