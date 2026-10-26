'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../src/quiet-wing/engine.js');
const app = fs.readFileSync(require.resolve('../src/quiet-wing/app.js'), 'utf8');
const start = app.indexOf('      async function reviewImport(');
const end = app.indexOf("      $('#file').onchange", start);
assert.ok(start >= 0 && end > start);

function fixture(isRealm) {
  const pending = Promise.withResolvers();
  const started = Promise.withResolvers();
  const original = E.newState(1700000000000);
  let confirm,
    closeCount = 0,
    validated = 0;
  const A = { state: original, history: [], future: [] };
  const modal = { close: () => closeCount++ };
  const review = vm.runInNewContext(app.slice(start, end) + '; reviewImport;', {
    G: {
      AlibiValidateImport: async () => {
        const next = E.newState(1700000001000 + validated++);
        return { isRealm, next: isRealm ? next.scene : next };
      },
    },
    S: {
      info: () => ({ mode: 'indexeddb' }),
      replace: () => {
        started.resolve();
        return pending.promise;
      },
    },
    A,
    E,
    $: (selector) => (selector === '#confirm-import' ? confirm : {}),
    modal: () => {
      confirm = { disabled: false };
      return modal;
    },
    esc: String,
    exportBackup() {},
    go() {},
    toast() {},
    flush: async () => {},
  });
  return {
    review: () => review({ size: 2, text: async () => '{}' }),
    button: () => confirm,
    closes: () => closeCount,
    started: started.promise,
    complete: pending.resolve,
    A,
    original,
  };
}

for (const isRealm of [false, true]) {
  const name = isRealm ? 'realm' : 'wing';
  test(`${name} restore finishing after another review leaves its shared dialog open`, async () => {
    const f = fixture(isRealm);
    await f.review();
    const firstButton = f.button();
    const importing = firstButton.onclick();
    await f.started;
    await f.review();
    const secondButton = f.button();
    assert.notEqual(firstButton, secondButton);
    f.complete();
    await importing;
    assert.equal(f.closes(), 0, 'only the confirmation that still owns the dialog can close it');
    assert.equal(secondButton.disabled, false, 'the second review remains usable');
    assert.notEqual(f.A.state, f.original, 'the already committed import still updates app state');
    assert.equal(f.A.history.length, isRealm ? 1 : 0);
  });
  test(`${name} restore closes its own review when it still owns the dialog`, async () => {
    const f = fixture(isRealm);
    await f.review();
    const importing = f.button().onclick();
    await f.started;
    f.complete();
    await importing;
    assert.equal(f.closes(), 1);
  });
}
