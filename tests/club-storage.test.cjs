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
  fs.writeFileSync(
    path.join(root, 'tests/club-storage-results.json'),
    JSON.stringify(
      {
        passed: true,
        assertions: checks.length,
        scope:
          'Separate Node VM sessions sharing a localStorage fixture. Tests rotation, pinning, fallback and sequential conflicts. Not real IndexedDB transactions or browser durability.',
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
