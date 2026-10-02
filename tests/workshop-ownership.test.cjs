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
const input = app.slice(
  app.indexOf("  document.addEventListener('input',"),
  app.indexOf("  document.addEventListener('change',"),
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
    save = deferred(),
    notices = [],
    saves = [],
    scrolls = [];
  let holdSave = false,
    onInput;
  const context = {
    FormData: class {
      get(key) {
        return { names: 'A,B,C,D,E', seed: '7', title: 'Case', setting: 'House', story: 'Story' }[
          key
        ];
      }
    },
    inWorker: () => worker.promise,
    store: {
      put: async (table, key, value) => {
        saves.push(structuredClone(value));
        if (holdSave) {
          holdSave = false;
          await save.promise;
        }
      },
    },
    toast: (message) => notices.push(message),
    render: () => {},
    document: {
      addEventListener: (name, callback) => {
        assert.equal(name, 'input');
        onInput = callback;
      },
      querySelector: () => ({ scrollIntoView: () => scrolls.push('editor') }),
    },
    settings: { reducedMotion: true },
  };
  const api = vm.runInNewContext(
    `(() => {
    let draft = {rooms:[0]}, draftVerified = false, draftBusy = false,
      draftEpoch = 0, draftShowSolution = false, routeSerial = 1, updateRequested = false,
      makerFields = {title:'Case'};
    ${helpers}
    ${input}
    return {
      verify: verifyDraft, generate: () => generateDraft({}),
      edit: () => { draft.rooms[0] = 1; dirtyDraft(); },
      navigate: () => routeSerial++, save: saveDraft,
      state: () => ({draft,draftVerified,draftBusy,makerFields}),
    };
  })()`,
    context,
  );
  return {
    ...api,
    worker,
    saveResult: save,
    notices,
    saves,
    scrolls,
    formEdit: () =>
      onInput({
        target: {
          name: 'title',
          value: 'New case',
          closest: (selector) => selector === '#scene-form',
        },
      }),
    holdSave: () => {
      holdSave = true;
    },
  };
}

for (const operation of ['verify', 'generate']) {
  for (const outcome of ['success', 'error']) {
    test(`${operation} discards ${outcome} after native generator input`, async () => {
      const f = fixture(),
        original = f.state().draft,
        pending = f[operation]();
      f.formEdit();
      if (outcome === 'success') f.worker.resolve({ rooms: [2] });
      else f.worker.reject(Error('obsolete result'));
      await pending;
      assert.equal(f.state().draft, original);
      assert.equal(f.state().makerFields.title, 'New case');
      assert.equal(f.state().draftBusy, false);
      assert.equal(f.saves.length, 0);
      assert.deepEqual(f.notices, []);
      assert.deepEqual(f.scrolls, []);
    });
  }
}

for (const change of ['edit', 'navigate', 'current']) {
  test(`draft save failure is owned after ${change}`, async () => {
    const f = fixture();
    f.holdSave();
    const pending = f.save();
    if (change !== 'current') f[change]();
    f.saveResult.reject(Error('save failure'));
    await pending;
    await new Promise(setImmediate);
    assert.deepEqual(f.notices, change === 'current' ? ['save failure'] : []);
  });
}
