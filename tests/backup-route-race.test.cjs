'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || path.join(__dirname, '..', 'src', 'app.js'),
  'utf8',
);
function appFunction(name) {
  const start = source.indexOf(`  async function ${name}(`);
  assert.notEqual(start, -1, `${name} exists in the app`);
  const end = source.indexOf('\n  async function ', start + 1);
  assert.notEqual(end, -1, `${name} has a following function boundary`);
  return source.slice(start, end);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const cabinet = {
  runs: [{ key: 'existing' }, { key: 'missing' }],
  packs: [{ id: 'custom-pack' }],
};
const combined = {
  sections: { cabinet, club: {}, quiet: {}, castle: {} },
  warnings: ['Keep the recovery copy.'],
};
const cases = [
  {
    name: 'stageAll',
    type: 'combined-backup',
    data: combined,
    limit: 20,
    title: 'Choose a section to restore',
  },
  {
    name: 'importBackup',
    type: 'cabinet-backup',
    data: cabinet,
    limit: 16,
    title: 'Restore your progress.',
  },
];
function fixture(subject, worker) {
  const dialogs = [],
    requests = [];
  const previousAll = { sections: { cabinet, club: {} }, warnings: [] };
  const previousBackup = { runs: [{ key: 'previous' }], packs: [] };
  const context = {
    previousAll,
    previousBackup,
    records: new Map([['existing', {}]]),
    esc: (text) => text,
    dialog: (title, body, actions) => dialogs.push({ title, body, actions }),
    inWorker: (request) => {
      requests.push(request);
      return worker(request);
    },
  };
  vm.runInNewContext(
    `
    let routeSerial = 10, stagedAll = previousAll, pendingBackup = previousBackup;
    ${appFunction(subject.name)}
    globalThis.api = {
      run: ${subject.name},
      navigate() { routeSerial++; },
      get stagedAll() { return stagedAll; },
      get pendingBackup() { return pendingBackup; }
    };
  `,
    context,
    { filename: 'src/app.js' },
  );
  return {
    api: context.api,
    dialogs,
    requests,
    assertPrevious() {
      assert.equal(context.api.stagedAll, previousAll);
      assert.equal(context.api.pendingBackup, previousBackup);
      assert.equal(dialogs.length, 0, 'no restore dialog opens after navigation');
    },
  };
}

for (const subject of cases) {
  test(`${subject.name}: publishes the validated backup on the same route`, async () => {
    const f = fixture(subject, async () => subject.data);
    await f.api.run({ size: 20, text: async () => 'backup text' });
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].type, subject.type);
    assert.equal(f.requests[0].text, 'backup text');
    assert.equal(f.dialogs.length, 1);
    assert.equal(f.dialogs[0].title, subject.title);
    if (subject.name === 'stageAll') {
      assert.equal(f.api.stagedAll, combined);
      assert.match(f.dialogs[0].body, /Keep the recovery copy/);
      assert.deepEqual(
        Array.from(f.dialogs[0].actions, (action) => action.action),
        ['all-cabinet', 'all-club', 'all-quiet', 'all-castle', 'close-dialog'],
      );
    } else {
      assert.equal(f.api.pendingBackup, cabinet);
      assert.match(f.dialogs[0].body, /2 saved puzzles/);
      assert.match(f.dialogs[0].body, /1 custom packs/);
      assert.match(f.dialogs[0].body, /1 saved puzzle already exists/);
      assert.deepEqual(
        Array.from(f.dialogs[0].actions, (action) => action.action),
        ['restore-merge', 'restore-replace', 'export', 'close-dialog'],
      );
    }
  });

  test(`${subject.name}: navigation during file reading retains the previous backup`, async () => {
    const reading = deferred();
    const f = fixture(subject, async () => subject.data);
    const importing = f.api.run({ size: 20, text: () => reading.promise });
    assert.equal(f.requests.length, 0);
    f.api.navigate();
    reading.resolve('backup text');
    await importing;
    assert.equal(f.requests.length, 1, 'validation still finishes without publishing');
    f.assertPrevious();
  });

  test(`${subject.name}: navigation during worker validation retains the previous backup`, async () => {
    const validation = deferred(),
      started = deferred();
    const f = fixture(subject, () => {
      started.resolve();
      return validation.promise;
    });
    const importing = f.api.run({ size: 20, text: async () => 'backup text' });
    await started.promise;
    f.api.navigate();
    validation.resolve(subject.data);
    await importing;
    f.assertPrevious();
  });

  for (const failingAt of ['reading', 'validation']) {
    test(`${subject.name}: stale ${failingAt} rejection retains state without feedback`, async () => {
      const failure = deferred(),
        started = deferred();
      const f = fixture(subject, () => {
        started.resolve();
        return failure.promise;
      });
      const importing = f.api.run({
        size: 20,
        text: () => (failingAt === 'reading' ? failure.promise : Promise.resolve('backup text')),
      });
      const error = new Error('Unreadable backup');
      const settled = assert.doesNotReject(importing);
      if (failingAt === 'validation') await started.promise;
      f.api.navigate();
      failure.reject(error);
      await settled;
      f.assertPrevious();
    });
  }

  test(`${subject.name}: a current validation error still reaches the caller`, async () => {
    const error = new Error('Current backup validation failed');
    const f = fixture(subject, async () => {
      throw error;
    });
    await assert.rejects(
      f.api.run({ size: 20, text: async () => 'backup text' }),
      (actual) => actual === error,
    );
    f.assertPrevious();
  });

  test(`${subject.name}: the byte limit still rejects before reading or validation`, async () => {
    const f = fixture(subject, async () => subject.data);
    let read = false;
    await assert.rejects(
      f.api.run({
        size: subject.limit * 1024 * 1024 + 1,
        text: async () => {
          read = true;
          return 'backup text';
        },
      }),
      /exceeds/,
    );
    assert.equal(read, false);
    assert.equal(f.requests.length, 0);
    f.assertPrevious();
  });
}

function restoreHarness(store) {
  let reloads = 0,
    closedDialogs = 0;
  const dialogs = [];
  const listeners = [];
  const modal = {
    open: true,
    addEventListener: (event, callback, options) => listeners.push({ callback, options }),
  };
  const context = {
    queue: Promise.resolve(),
    clearTimeout,
    enqueueSave: () => Promise.resolve(),
    C: { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
    inWorker: async (message) => message.value,
    store,
    channel: null,
    closeDialog() {
      closedDialogs++;
    },
    esc: (value) => value,
    dialog: (...args) => {
      modal.open = true;
      dialogs.push(args);
    },
    $: (selector) => (selector === '#dialog' ? modal : { focus() {} }),
    document: { getElementById: () => null },
    location: {
      reload() {
        reloads += 1;
      },
    },
  };
  vm.runInNewContext(
    `
    let pendingBackup = { runs: [], packs: [] }, restoreBusy = false,
      stagedCabinet = null, dialogOpener = null, noteTimer = null;
    ${source.slice(source.indexOf("  $('#dialog').addEventListener('close', () => {"), source.indexOf("  $('#dialog').addEventListener('cancel',"))}
    ${appFunction('restoreBackup')}
    globalThis.api = { run: restoreBackup };
  `,
    context,
    { filename: 'src/app.js' },
  );
  return {
    run: context.api.run,
    reloads: () => reloads,
    closedDialogs: () => closedDialogs,
    dialogs,
    dismiss: (stale = false) => {
      modal.open = stale;
      for (const listener of [...listeners]) {
        if (listener.options?.once) listeners.splice(listeners.indexOf(listener), 1);
        listener.callback();
      }
      modal.onclose?.();
    },
  };
}

test('restoreBackup presents the skipped-draft note and recovery action before reload', async () => {
  const note = 'The backup workshop draft was not applied and is kept in Recovery copy.';
  const harness = restoreHarness({
    mode: 'indexeddb',
    restore: async () => ({ note }),
  });
  await harness.run(true);
  assert.equal(harness.closedDialogs(), 0, 'replace the open dialog without queuing a close event');
  assert.equal(harness.reloads(), 0, 'the result stays visible until acknowledged');
  assert.equal(harness.dialogs.length, 1);
  const [title, body, buttons] = harness.dialogs[0];
  assert.equal(title, 'Progress restored.');
  assert.ok(body.includes(note));
  assert.ok(buttons.some((button) => button.action === 'recovery'));
  assert.ok(buttons.some((button) => button.action === 'reload'));
  harness.dismiss();
  assert.equal(harness.reloads(), 1, 'closing or escaping the notice also reloads restored state');
});

test('merge keeps the raw damaged draft in its conflict snapshot after export omits it', async () => {
  const damaged = { puzzle: { type: 'scene' } };
  let restored = false;
  const harness = restoreHarness({
    mode: 'indexeddb',
    export: async () => ({ runs: [], packs: [], damaged: { meta: ['workshop-draft'] } }),
    get: async (table, key) => {
      assert.equal(table, 'meta');
      assert.equal(key, 'workshop-draft');
      return damaged;
    },
    restore: async (backup, expected) => {
      assert.deepEqual(expected.workshopDraft, damaged);
      assert.equal(Object.hasOwn(backup, 'workshopDraft'), false);
      restored = true;
    },
  });
  await harness.run();
  assert.equal(restored, true);
  assert.equal(harness.reloads(), 1);
});

test('restoreBackup starts one restore when a second call arrives during the first', async () => {
  const started = deferred();
  const restoring = deferred();
  let restores = 0;
  const harness = restoreHarness({
    mode: 'indexeddb',
    restore() {
      restores += 1;
      if (restores === 1) started.resolve();
      return restoring.promise;
    },
  });
  const first = harness.run(true);
  await started.promise;
  const second = harness.run(true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(restores, 1);
  restoring.resolve();
  await first;
  await second;
  assert.equal(harness.reloads(), 1);
});

test('restoreBackup can run again after the first restore fails', async () => {
  let restores = 0;
  const harness = restoreHarness({
    mode: 'indexeddb',
    restore() {
      restores += 1;
      if (restores === 1) return Promise.reject(new Error('disk busy'));
      return Promise.resolve();
    },
  });
  await assert.rejects(harness.run(true), /disk busy/);
  await harness.run(true);
  assert.equal(restores, 2);
  assert.equal(harness.reloads(), 1);
});

test('a queued old dialog close cannot dismiss the reopened restore note', async () => {
  const saving = deferred();
  const harness = restoreHarness({ mode: 'indexeddb', restore: () => saving.promise });
  const restoring = harness.run(true);
  await Promise.resolve();
  saving.resolve({ note: 'Keep original backup.' });
  await restoring;
  harness.dismiss(true); // close event queued before the new notice's showModal
  assert.equal(harness.reloads(), 0, 'stale close must leave the reopened note readable');
  harness.dismiss();
  assert.equal(harness.reloads(), 1, 'the real notice close still reloads');
});

function restoredBranch() {
  const start = source.indexOf("if (e.data?.type === 'restored') {");
  assert.notEqual(start, -1, 'the restored broadcast branch exists');
  return source.slice(start, source.indexOf('return;', start) + 'return;'.length) + ' }';
}

function draftBackupHarness(put) {
  let exported = 0;
  const context = {
    store: {
      saveDraft: async (value, rev) => {
        await put();
        return { ...value, rev: rev + 1 };
      },
      async export() {
        exported++;
        return { runs: [], packs: [], workshopDraft: { puzzle: { id: 'other-tab-draft' } } };
      },
    },
    enqueueSave: async () => {},
    queue: Promise.resolve(),
    C: { clone: structuredClone },
    records: new Map(),
    acked: new Map(),
    packs: [],
    settings: {},
    prefs: {},
    cfg: { version: 'test' },
    toast() {},
    render() {},
  };
  vm.runInNewContext(
    `
    let draft = { id: 'local-draft' }, draftEpoch = 0, routeSerial = 0,
      draftSave, draftVerified = false, makerEpoch = 0, draftRev = 0, draftStale = null, channel = null, staleDraft = 'Draft changed in another tab.';
    let saveError = null;
    function restored() {
      const e = { data: { type: 'restored' } };
      ${restoredBranch()}
    }
    ${appFunction('saveDraft')}
    ${appFunction('cabinetBackup')}
    globalThis.api = { save: saveDraft, backup: cabinetBackup, restored };
  `,
    context,
  );
  return { ...context.api, exported: () => exported };
}

test('cabinet export refuses an unsaved draft instead of silently exporting the previous one', async () => {
  const h = draftBackupHarness(async () => {
    throw Error('quota exceeded');
  });
  await h.save(); // normal editing already reports failure through its existing toast
  await assert.rejects(h.backup(), /quota exceeded/);
  assert.equal(h.exported(), 0);
});

test('a draft conflict stops autosave but still exports runs with the stored device draft', async () => {
  let puts = 0;
  const h = draftBackupHarness(async () => {
    puts++;
    throw Object.assign(Error('stored draft changed'), { name: 'ConflictError' });
  });
  await h.save();
  await h.save();
  assert.equal(puts, 1, 'nothing is written after a conflict');
  const { data } = await h.backup();
  assert.equal(h.exported(), 1, 'a stale draft must not block exporting run progress');
  assert.equal(
    data.workshopDraft.puzzle.id,
    'other-tab-draft',
    'the stored device draft is exported',
  );
});

test('a restore after a draft conflict keeps the stale error so export still proceeds', async () => {
  const h = draftBackupHarness(async () => {
    throw Object.assign(Error('stored draft changed'), { name: 'ConflictError' });
  });
  await h.save();
  h.restored();
  const { data } = await h.backup();
  assert.equal(data.workshopDraft.puzzle.id, 'other-tab-draft');
});

test('cabinet export awaits a pending draft failure and successful edit permits retry without resaving', async () => {
  const pending = deferred();
  let puts = 0;
  const h = draftBackupHarness(() => (++puts === 1 ? pending.promise : Promise.resolve()));
  const save = h.save();
  const backup = h.backup();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.exported(), 0, 'do not construct a backup before the pending save settles');
  pending.reject(Error('transaction aborted'));
  await save;
  await assert.rejects(backup, /transaction aborted/);
  await h.save();
  const result = await h.backup();
  assert.equal(result.data.workshopDraft.puzzle.id, 'other-tab-draft');
  assert.equal(puts, 2, 'export never retries the local draft write over another tab');
});
