'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync(require('node:path').join(__dirname, '../src/app.js'), 'utf8');
const deskSource = app.slice(
  app.indexOf('  function packDesk() {'),
  app.indexOf('  function authorGuide() {'),
);
const warningSource = app.slice(
  app.indexOf('  const packAdvice ='),
  app.indexOf('  function packDesk() {'),
);
const syncSource = app.slice(
  app.indexOf('  async function syncPacks() {'),
  app.indexOf('  async function importPack(file) {'),
);
const importSource = app.slice(
  app.indexOf('  async function importBackup(file, serial = routeSerial) {'),
  app.indexOf('  async function restoreBackup('),
);
assert.ok(deskSource.startsWith('  function packDesk() {'));
assert.ok(warningSource.includes('function packWarning(text)'));
assert.ok(syncSource.startsWith('  async function syncPacks() {'));
assert.ok(importSource.startsWith('  async function importBackup('));

const packsFor = (count, prefix = 'custom') => {
  const packs = [];
  for (let i = 0; i < count; i += 150)
    packs.push({
      id: `${prefix}-pack-${packs.length}`,
      title: `Pack ${packs.length}`,
      version: 1,
      puzzles: Array.from({ length: Math.min(150, count - i) }, (_, n) => ({
        id: `${prefix}-${i + n}`,
      })),
    });
  return packs;
};

function renderDesk(customCount) {
  const starter = {
    id: 'starter',
    title: 'Starter',
    version: 1,
    puzzles: Array.from({ length: 612 }, (_, i) => ({ id: `starter-${i}` })),
  };
  const packs = [starter, ...packsFor(customCount)];
  const context = vm.createContext({
    C: { TYPES: Array(13) },
    packs,
    starter,
    all: () => packs.flatMap((pack) => pack.puzzles),
    icon: () => '',
    B: (label, action) => `<button data-action="${action}">${label}</button>`,
    esc: (value) => String(value),
  });
  vm.runInContext(warningSource + '\n' + deskSource + '\nthis.html = packDesk();', context);
  return context.html;
}

test('Workbench shows the current over-limit total and pack recovery guidance', () => {
  const html = renderDesk(2389);
  assert.match(html, /<strong>2389<\/strong><small>Custom puzzles<\/small>/);
  assert.match(html, /class="notice pack-limit"/);
  assert.match(html, /3001 total/);
  assert.match(html, /3,000-puzzle import limit/i);
  assert.match(html, /Export and remove packs to add more/i);
  assert.ok(html.indexOf('id="pack-list"') < html.indexOf('class="notice pack-limit"'));
});

test('pack-added and pack-removed refresh the Workbench warning and live count', async () => {
  const starter = {
    id: 'starter',
    title: 'Starter',
    version: 1,
    puzzles: Array.from({ length: 612 }, (_, i) => ({ id: `starter-${i}` })),
  };
  const db = { rows: [] };
  let currentList;
  const listNode = (html = '') => ({
    html,
    contains: () => false,
    replaceWith(next) {
      currentList = next;
    },
  });
  currentList = listNode();
  const stats = [{ textContent: '13' }, { textContent: '0' }, { textContent: '0' }];
  const context = vm.createContext({
    C: { TYPES: Array(13), validatePack: (pack) => pack },
    starter,
    store: { mode: 'indexeddb', getAll: async () => db.rows },
    document: {
      activeElement: null,
      createElement: () => {
        let html = '';
        return {
          set innerHTML(value) {
            html = value;
          },
          querySelector: (selector) => (selector === '#pack-list' ? listNode(html) : null),
        };
      },
      querySelectorAll: (selector) => {
        assert.equal(selector, '.library-summary .mini-stat strong');
        return stats;
      },
    },
    $: (selector) => (selector === '#pack-list' ? currentList : null),
    toast: () => {},
    icon: () => '',
    B: (label, action) => `<button data-action="${action}">${label}</button>`,
    esc: (value) => String(value),
  });
  vm.runInContext(
    `${warningSource}
let packs = [starter], packReady = true, packSync = false, packDirty = true;
const all = () => packs.flatMap((pack) => pack.puzzles);
${deskSource}\n${syncSource}
this.refreshPacks = syncPacks;
this.markDirty = () => { packDirty = true; };
this.getPacks = () => packs;`,
    context,
  );

  await context.refreshPacks();
  assert.doesNotMatch(currentList.html, /class="notice pack-limit"/);
  assert.equal(stats[2].textContent, 0);

  db.rows = packsFor(2389);
  context.markDirty();
  await context.refreshPacks();
  assert.match(currentList.html, /3001 total/);
  assert.equal(stats[2].textContent, 2389);

  db.rows = [];
  context.markDirty();
  await context.refreshPacks();
  assert.doesNotMatch(currentList.html, /class="notice pack-limit"/);
  assert.equal(stats[2].textContent, 0);
});

async function previewBackup(backupPacks) {
  const dialogs = [];
  const context = vm.createContext({
    records: new Map(),
    inWorker: async () => ({ runs: [], packs: backupPacks }),
    dialog: (title, body, actions) => dialogs.push({ title, body, actions }),
  });
  const fn = vm.runInContext(
    `${warningSource}\nlet pendingBackup = null, routeSerial = 1;\n${importSource}\nthis.runImport = importBackup;`,
    context,
  );
  await context.runImport({ size: 1, text: async () => '{}' });
  assert.equal(dialogs.length, 1);
  return dialogs[0];
}

test('restore preview explains legacy over-limit policy without blocking restore choices', async () => {
  const preview = await previewBackup(packsFor(2400, 'backup'));
  assert.equal(preview.title, 'Restore your progress.');
  assert.match(preview.body, /Restores can exceed 3,000 puzzles/i);
  assert.match(preview.body, /Export and remove packs to add more/i);
  assert.deepEqual(
    Array.from(preview.actions, (action) => action.action),
    ['restore-merge', 'restore-replace', 'export', 'close-dialog'],
  );
});

test('restore policy note avoids predicting the size of this backup', async () => {
  const preview = await previewBackup(packsFor(150, 'backup'));
  assert.match(preview.body, /Add missing/i);
  assert.match(preview.body, /Restores can exceed 3,000 puzzles/i);
  assert.doesNotMatch(preview.body, /this backup (?:may|will) exceed/i);
});

test('restore preview omits pack policy when the backup has no custom packs', async () => {
  const preview = await previewBackup([]);
  assert.doesNotMatch(preview.body, /pack-limit/);
});
