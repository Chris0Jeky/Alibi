'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(require.resolve('../src/app.js'), 'utf8');
const helpers = app.slice(
  app.indexOf('  async function saveDraft()'),
  app.indexOf('  function clueValues()'),
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
    save = deferred();
  const saves = [],
    notices = [],
    scrolls = [];
  let delaySave = false;
  const context = {
    FormData: class {
      get(key) {
        return {
          names: 'A, B, C, D, E',
          seed: '7',
          title: 'Case',
          setting: 'House',
          story: 'Story',
        }[key];
      }
    },
    inWorker: () => worker.promise,
    store: {
      put: async (table, key, value) => {
        saves.push(structuredClone(value));
        if (delaySave) await save.promise;
      },
    },
    toast: (message) => notices.push(message),
    render: () => {},
    document: { querySelector: () => ({ scrollIntoView: () => scrolls.push('editor') }) },
    settings: { reducedMotion: true },
  };
  const api = vm.runInNewContext(
    `(() => {
    let draft = { rooms: [0], roomNames: ['A', 'B'] }, draftRevision = 0,
      draftVerified = false, draftBusy = false, draftShowSolution = false, routeSerial = 1;
    ${helpers}
    return {
      verify: verifyDraft, generate: () => generateDraft({}),
      edit: () => { draft.rooms[0] = 1; dirtyDraft(); },
      navigate: () => { routeSerial++; },
      state: () => ({ draft, draftVerified, draftBusy })
    };
  })()`,
    context,
  );
  return {
    ...api,
    worker,
    save,
    saves,
    notices,
    scrolls,
    delaySave: () => {
      delaySave = true;
    },
  };
}

for (const operation of ['verify', 'generate']) {
  test(`${operation} publishes an unchanged draft on its original route`, async () => {
    const f = fixture(),
      result = { rooms: [0], roomNames: ['A', 'B'] };
    const pending = f[operation]();
    f.worker.resolve(result);
    await pending;
    assert.equal(f.state().draft, result);
    assert.equal(f.state().draftVerified, true);
    assert.equal(f.state().draftBusy, false);
    assert.equal(f.saves.length, 1);
    assert.equal(f.notices.length, operation === 'verify' ? 1 : 0);
    assert.equal(f.scrolls.length, operation === 'generate' ? 1 : 0);
  });

  for (const change of ['edit', 'navigate']) {
    for (const outcome of ['success', 'error']) {
      test(`${operation} discards ${outcome} after ${change}`, async () => {
        const f = fixture(),
          original = f.state().draft;
        const pending = f[operation]();
        f[change]();
        if (change === 'navigate') f.navigate(); // Return to the same URL is still a new route.
        if (outcome === 'success') f.worker.resolve({ rooms: [0], roomNames: ['old', 'B'] });
        else f.worker.reject(Error('obsolete validation failure'));
        await pending;
        assert.equal(f.state().draft, original, 'old worker cannot replace the current draft');
        assert.equal(f.state().draft.rooms[0], change === 'edit' ? 1 : 0);
        assert.equal(f.state().draftVerified, false);
        assert.equal(f.state().draftBusy, false, 'controls become available again');
        assert.equal(f.saves.length, change === 'edit' ? 1 : 0, 'only native edits may save');
        assert.deepEqual(f.notices, []);
        assert.deepEqual(f.scrolls, []);
      });
    }
  }

  test(`${operation} reports current worker errors and releases its busy state`, async () => {
    const f = fixture(),
      pending = f[operation]();
    f.worker.reject(Error('current failure'));
    await assert.rejects(pending, /current failure/);
    assert.equal(f.state().draftVerified, false);
    assert.equal(f.state().draftBusy, false);
  });

  test(`${operation} does not announce success after navigation during draft saving`, async () => {
    const f = fixture();
    f.delaySave();
    const pending = f[operation]();
    f.worker.resolve({ rooms: [0] });
    await new Promise(setImmediate);
    assert.equal(f.saves.length, 1);
    f.navigate();
    f.save.resolve();
    await pending;
    assert.deepEqual(f.notices, []);
    assert.deepEqual(f.scrolls, []);
  });
}

test('an obsolete draft save failure does not show feedback on the next route', async () => {
  const f = fixture();
  f.delaySave();
  f.edit();
  f.navigate();
  f.save.reject(Error('obsolete save failure'));
  await new Promise(setImmediate);
  assert.deepEqual(f.notices, []);
});
