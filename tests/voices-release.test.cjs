'use strict';
// Release must be a string: feedback() and survey() return null for a missing,
// undefined or non-string release, and still accept a valid release.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/voices-queue.js'), 'utf8');

function storage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function queue() {
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'voices-queue.js' });
  let n = 0;
  return context.AlibiVoicesQueue({
    storage: storage(),
    uuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  });
}

const answers = { often: 'daily', difficulty: 'mixed' };

test('feedback requires a string release', () => {
  const q = queue();
  const base = { kind: 'bug', route: 'home', text: 'hello', device: 'desktop' };
  assert.equal(q.feedback({ ...base, release: undefined }), null);
  assert.equal(q.feedback({ ...base }), null);
  for (const release of [123, null, {}, ['1.2.3']]) {
    assert.equal(q.feedback({ ...base, release }), null);
  }
  const ok = q.feedback({ ...base, release: '1.2.3' });
  assert.ok(ok);
  assert.equal(ok.release, '1.2.3');
});

test('survey requires a string release', () => {
  const q = queue();
  const base = { survey: 'alibi-taste-1', answers, device: 'mobile' };
  assert.equal(q.survey({ ...base, release: undefined }), null);
  assert.equal(q.survey({ ...base }), null);
  for (const release of [123, null, {}, ['1.2.3']]) {
    assert.equal(q.survey({ ...base, release }), null);
  }
  const ok = q.survey({ ...base, release: '1.2.3' });
  assert.ok(ok);
  assert.equal(ok.release, '1.2.3');
});
