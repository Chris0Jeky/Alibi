'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(require.resolve('../src/app.js'), 'utf8');
const helpers = app.slice(
  app.indexOf('  async function stageAll(file)'),
  app.indexOf('  async function restoreBackup('),
);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture() {
  const worker = deferred(),
    read = deferred(),
    dialogs = [];
  const api = vm.runInNewContext(
    `(() => {
    let routeSerial = 1, pendingBackup = null, stagedAll = null;
    ${helpers}
    return { cabinet: importBackup, combined: stageAll,
      navigate: () => routeSerial++, state: () => ({ pendingBackup, stagedAll }) };
  })()`,
    {
      inWorker: () => worker.promise,
      dialog: (title) => dialogs.push(title),
      esc: (text) => text,
      records: new Map(),
    },
  );
  return { ...api, worker, read, dialogs, file: { size: 10, text: () => read.promise } };
}
const cabinet = { runs: [], packs: [] };
const combined = { sections: { cabinet, club: {} } };
for (const kind of ['cabinet', 'combined']) {
  const data = kind === 'cabinet' ? cabinet : combined;
  test(`${kind} validation stages normally on its original route`, async () => {
    const f = fixture(),
      pending = f[kind](f.file);
    f.read.resolve('{}');
    f.worker.resolve(data);
    await pending;
    assert.equal(f.dialogs.length, 1);
    assert.equal(f.state()[kind === 'cabinet' ? 'pendingBackup' : 'stagedAll'], data);
  });
  for (const boundary of ['read', 'worker']) {
    for (const outcome of ['success', 'error']) {
      test(`${kind} discards ${outcome} after navigation during ${boundary}`, async () => {
        const f = fixture(),
          pending = f[kind](f.file);
        if (boundary === 'worker') {
          f.read.resolve('{}');
          await new Promise(setImmediate);
        }
        f.navigate();
        f.navigate(); // Away and back to the same path still invalidates ownership.
        if (boundary === 'read' && outcome === 'error') f.read.reject(Error('old read failure'));
        else {
          f.read.resolve('{}');
          if (outcome === 'error') f.worker.reject(Error('old validation failure'));
          else f.worker.resolve(data);
        }
        await pending;
        assert.equal(f.dialogs.length, 0);
        assert.equal(f.state().pendingBackup, null, 'no stale cabinet state is staged');
        assert.equal(f.state().stagedAll, null, 'no stale combined state is staged');
      });
    }
  }
  test(`${kind} still rejects current worker errors`, async () => {
    const f = fixture(),
      pending = f[kind](f.file);
    f.read.resolve('{}');
    f.worker.reject(Error('current failure'));
    await assert.rejects(pending, /current failure/);
    assert.equal(f.dialogs.length, 0);
  });
}
