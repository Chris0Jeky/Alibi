'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('the phone action surface keeps the overflow prerequisite for viewport stickiness', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/block-cabinet/style.css'), 'utf8');
  assert.match(
    css,
    /\.bc-studio\s*\{[\s\S]*?overflow:\s*clip;/,
    'the Block Cabinet root must not become a scrolling ancestor for the sticky action group',
  );
  assert.doesNotMatch(
    css,
    /\.bc-studio\s*\{[\s\S]*?overflow:\s*(?:hidden|auto|scroll);/,
    'hidden or scrolling overflow would trap the sticky controls inside the component',
  );
});

test('the verified phone-action candidate remains recorded with its human evidence limits', () => {
  const state = fs.readFileSync(path.join(ROOT, 'docs/STATE.md'), 'utf8');
  assert.match(state, /Block Cabinet phone action hierarchy candidate, 2026-09-17/);
  assert.match(state, /physical Android touch, TalkBack, comfort review and human acceptance stay open/);
});
