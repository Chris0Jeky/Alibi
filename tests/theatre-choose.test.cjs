const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/theatre.js'), 'utf8');

const scenes = [
  { id: 'reading-room', families: [], quiet: [] },
  { id: 'harbour', families: [], quiet: [] },
  { id: 'family-room', families: ['sudoku'], quiet: [] },
];

function loadChoose(storedChoice) {
  const store = new Map();
  if (storedChoice !== undefined) store.set('alibi-room', storedChoice);
  const realm = {
    ALIBI_THEATRE: { scenes, audio: [], films: [] },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    document: {
      addEventListener() {},
      querySelector: () => null,
    },
    addEventListener() {},
  };
  vm.runInNewContext(source, realm, { timeout: 2000 });
  return realm.AlibiTheatre.choose;
}

test('choose() pins route priority and fallbacks', () => {
  const choose = loadChoose();
  assert.equal(choose({ page: 'quiet', id: 'unknown-id' }).id, 'reading-room');
  assert.equal(choose({ page: 'lab' }).id, 'harbour');
  assert.equal(choose({ page: 'play', id: 'borough' }).id, 'harbour');
  assert.equal(
    choose({ page: 'play', id: 'unrelated' }, { type: 'sudoku' }).id,
    'family-room',
  );
  assert.equal(choose({ page: 'play', id: 'unrelated' }).id, 'reading-room');
});

test('choose() lets a valid saved choice win over route mapping', () => {
  const choose = loadChoose('harbour');
  assert.equal(choose({ page: 'lab' }).id, 'harbour');
  assert.equal(choose({ page: 'quiet', id: 'unknown-id' }).id, 'harbour');
  assert.equal(
    choose({ page: 'play', id: 'unrelated' }, { type: 'sudoku' }).id,
    'harbour',
  );
});

test('choose() keeps route branches ahead of the family fallback', () => {
  const choose = loadChoose();
  assert.equal(
    choose({ page: 'lab' }, { type: 'sudoku' }).id,
    'harbour',
    'lab wins over a matching puzzle family',
  );
  assert.equal(
    choose({ page: 'quiet', id: 'unknown-id' }, { type: 'sudoku' }).id,
    'reading-room',
    'quiet fallback wins over a matching puzzle family',
  );
});
