'use strict';
// B/go accept HTML; callers escape untrusted text before passing it to them.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'src', 'club.js'), 'utf8');

function loadHelpers() {
  const start = SRC.indexOf('const esc =');
  assert.notEqual(start, -1, 'src/club.js must define esc');
  const goStart = SRC.indexOf('const go =', start);
  assert.notEqual(goStart, -1, 'src/club.js must define go');
  const endMarker = '</button>`;';
  const end = SRC.indexOf(endMarker, goStart);
  assert.notEqual(end, -1, 'src/club.js must define B/go button helpers');
  const snippet = SRC.slice(start, end + endMarker.length);
  const factory = new Function(`${snippet}; return { esc, B, go };`);
  return factory();
}

const INPUT = '<img src="x">&"\'';
const ESCAPED = '&lt;img src=&quot;x&quot;&gt;&amp;&quot;&#39;';

test('esc neutralises markup characters', () => {
  const { esc } = loadHelpers();
  assert.equal(esc(INPUT), ESCAPED);
});

test('B preserves caller-escaped hostile text', () => {
  const { esc, B } = loadHelpers();
  const out = B(esc(INPUT), 'pin', '', '');
  assert.ok(out.endsWith(`>${ESCAPED}</button>`));
  assert.ok(!out.includes('<img'), 'B output carries no raw payload markup');
});

test('go preserves caller-escaped hostile text', () => {
  const { esc, go } = loadHelpers();
  const out = go(esc(INPUT), 'home');
  assert.ok(out.endsWith(`>${ESCAPED}</button>`));
  assert.ok(!out.includes('<img'), 'go output carries no raw payload markup');
});
