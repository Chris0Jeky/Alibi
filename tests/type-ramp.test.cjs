'use strict';

// #219: the desk display step must stay at or above the hero title step at every
// width, so the h1/h2 hierarchy cannot silently re-invert. Asserts the invariant
// from the published ramp tokens, not exact pixel values.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'club.css'), 'utf8');
const afterHours = fs.readFileSync(path.join(__dirname, '..', 'src', 'after-hours.css'), 'utf8');

function token(name) {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(match, `ramp token --${name} is defined`);
  return match[1].trim();
}

function minPx(value) {
  const clamp = value.match(/^clamp\((\d+(?:\.\d+)?)px,/);
  if (clamp) return Number(clamp[1]);
  const px = value.match(/^(\d+(?:\.\d+)?)px$/);
  assert.ok(px, `ramp token resolves to px: ${value}`);
  return Number(px[1]);
}

test('desk display tokens stay at or above the hero title token', () => {
  const title = minPx(token('club-title'));
  for (const name of ['club-display', 'club-display-narrow', 'club-display-compact']) {
    assert.ok(
      minPx(token(name)) >= title,
      `--${name} must stay >= --club-title to preserve h1/h2 hierarchy`,
    );
  }
});

test('desk h1 and hero h2 consume the ramp tokens', () => {
  assert.match(css, /\.club-welcome h1 \{[^}]*font-size: var\(--club-display\)/s);
  // The winning hero rule lives in after-hours.css (later in the bundle than club.css).
  assert.match(afterHours, /\.hero-copy h2 \{[^}]*font-size: var\(--club-title\)/s);
  assert.doesNotMatch(
    css,
    /\.hero-copy h2 \{[^}]*font-size:/s,
    'club.css must not carry a dead hero font-size overridden by after-hours.css',
  );
});
