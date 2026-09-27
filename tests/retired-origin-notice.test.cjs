'use strict';
// The retired Sites fallback shows an in-flow "moved" notice from src/boot.js; every other origin is untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BOOT = fs.readFileSync(path.join(__dirname, '..', 'src', 'boot.js'), 'utf8');
const RETIRED = 'https://alibi-puzzle-club.jeky-tck.chatgpt.site';
const PRIMARY = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';

function run(origin) {
  const prepended = [];
  const document = {
    title: '',
    getElementById: () => null,
    createElement(tag) {
      const attrs = {};
      return { tag, style: {}, setAttribute: (k, v) => (attrs[k] = v), attrs };
    },
    body: { prepend: (node) => prepended.push(node) },
  };
  const location = {
    origin,
    hash: '',
    href: origin + '/',
    pathname: '/',
    search: '',
    reload() {},
  };
  const context = {
    URL,
    Error,
    Promise,
    location,
    document,
    history: { state: null, replaceState() {} },
    addEventListener() {},
    setTimeout: () => 0,
    clearTimeout() {},
  };
  context.globalThis = context;
  vm.runInNewContext(BOOT, context);
  return prepended;
}

test('the retired Sites origin gets one moved notice with backup and new-site links', () => {
  const [notice, ...rest] = run(RETIRED);
  assert.equal(rest.length, 0);
  assert.equal(notice.tag, 'aside');
  assert.equal(notice.id, 'moved-notice');
  assert.equal(notice.attrs.role, 'note');
  assert.match(notice.innerHTML, /Alibi has moved\./);
  assert.match(notice.innerHTML, /href="#\/settings"/);
  assert.ok(notice.innerHTML.includes(`href="${PRIMARY}/"`));
  assert.match(notice.innerHTML, /Nothing here is deleted\./);
});

test('the primary, local and unknown origins show no notice', () => {
  for (const origin of [PRIMARY, 'http://127.0.0.1:8787', 'null', undefined])
    assert.deepEqual(run(origin), []);
});
