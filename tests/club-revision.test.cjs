'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function storage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

async function tab(localStorage) {
  const context = {
    clearTimeout,
    console,
    Date,
    document: {
      addEventListener() {},
      createElement() {
        return {};
      },
      body: { append() {} },
    },
    JSON,
    localStorage,
    location: { hash: '' },
    Math,
    Number,
    Promise,
    setTimeout,
    URL,
    URLSearchParams,
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file + '.js'), 'utf8'), context);
  await context.AlibiClub.init({ render() {}, settings: () => ({}), toast() {} });
  return context;
}

async function envelope() {
  const localStorage = storage();
  const context = await tab(localStorage);
  await context.AlibiClub.save();
  return {
    localStorage,
    value: JSON.parse(localStorage.getItem('alibi-afterhours-v1')),
  };
}

test('an unsafe fallback Club revision is preserved as unsupported', async () => {
  const fixture = await envelope();
  fixture.value.rev = Number.MAX_SAFE_INTEGER + 1;
  const raw = JSON.stringify(fixture.value);
  fixture.localStorage.setItem('alibi-afterhours-v1', raw);

  const context = await tab(fixture.localStorage);

  assert.equal(fixture.localStorage.getItem('alibi-afterhours-v1'), raw);
  assert.equal(context.AlibiClub.diagnostics().storageMode, 'session');
  assert.match(context.AlibiClub.diagnostics().saveError, /untouched/i);
});

test('the final safe Club revision remains readable but cannot overflow', async () => {
  const fixture = await envelope();
  fixture.value.rev = Number.MAX_SAFE_INTEGER;
  const raw = JSON.stringify(fixture.value);
  fixture.localStorage.setItem('alibi-afterhours-v1', raw);

  const context = await tab(fixture.localStorage);

  assert.equal(fixture.localStorage.getItem('alibi-afterhours-v1'), raw);
  assert.match(context.AlibiClub.diagnostics().saveError, /revision limit|export/i);
});

test('the penultimate Club revision advances exactly to the safe limit', async () => {
  const fixture = await envelope();
  fixture.value.rev = Number.MAX_SAFE_INTEGER - 1;
  fixture.localStorage.setItem('alibi-afterhours-v1', JSON.stringify(fixture.value));

  const context = await tab(fixture.localStorage);
  const saved = JSON.parse(fixture.localStorage.getItem('alibi-afterhours-v1'));

  assert.equal(saved.rev, Number.MAX_SAFE_INTEGER);
  assert.equal(context.AlibiClub.diagnostics().saveError, '');
});
