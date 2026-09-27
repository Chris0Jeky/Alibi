'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('the phone action surface keeps document scrolling and bottom-only viewport stickiness', () => {
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
  const actions = css.match(/body\.block-motion-active \.bc-controls\s*\{([^}]*)\}/)[1];
  assert.match(actions, /position:\s*sticky;/, 'the phone action group stays sticky');
  assert.match(
    actions,
    /bottom:\s*max\(8px, env\(safe-area-inset-bottom\)\);/,
    'the phone action group sticks to the bottom of the viewport',
  );
  assert.doesNotMatch(
    actions,
    /(?:^|[\s;])top:/,
    'a top constraint would pin the actions over the rules and menu after scrolling past them',
  );
  assert.match(
    actions,
    /grid-auto-flow:\s*column;/,
    'one row of actions keeps the bar short enough to sit under the tray',
  );
  const surface = fs.readFileSync(path.join(ROOT, 'src/block-cabinet/surface.mjs'), 'utf8');
  assert.ok(
    surface.indexOf('class="bc-controls"') < surface.indexOf('class="bc-selection"'),
    'the actions follow the tray directly, so resting controls never cover the next-move text',
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
