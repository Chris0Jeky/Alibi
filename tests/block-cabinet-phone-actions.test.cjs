'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('the phone action surface keeps document scrolling and two-sided viewport stickiness', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/block-cabinet/style.css'), 'utf8');
  assert.match(
    css,
    /\.bc-studio\s*\{[\s\S]*?overflow:\s*clip;/,
    'the Block Cabinet root must not become a scrolling ancestor for the sticky action group',
  );
  assert.match(
    css,
    /body\.block-motion-active \.bc-studio\s*\{[\s\S]*?overflow:\s*visible;/,
    'the phone surface must leave the document as the sticky scroll owner',
  );
  assert.match(
    css,
    /body\.block-motion-active \.bc-play\s*\{[\s\S]*?display:\s*contents;/,
    'the phone play area must not constrain the sticky action group to the board column',
  );
  assert.match(
    css,
    /body\.block-motion-active \.bc-studio::before\s*\{[\s\S]*?clip-path:\s*inset\(0\);/,
    'phone overflow removal must retain safe clipping for decorative artwork',
  );
  assert.doesNotMatch(
    css,
    /\.bc-studio\s*\{[\s\S]*?overflow:\s*(?:hidden|auto|scroll);/,
    'hidden or scrolling overflow would trap the sticky controls inside the component',
  );
  assert.match(
    css,
    /body\.block-motion-active \.bc-controls\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*max\(8px, env\(safe-area-inset-top\)\);[\s\S]*?bottom:\s*max\(8px, env\(safe-area-inset-bottom\)\);/,
    'the phone action group needs top and bottom constraints while the document remains the scroller',
  );
});

test('the verified phone-action candidate remains recorded with its human evidence limits', () => {
  const state = fs.readFileSync(path.join(ROOT, 'docs/STATE.md'), 'utf8');
  assert.match(state, /Block Cabinet phone action hierarchy candidate, 2026-09-17/);
  assert.match(
    state,
    /physical Android touch, TalkBack, comfort review and human acceptance stay open/,
  );
});
