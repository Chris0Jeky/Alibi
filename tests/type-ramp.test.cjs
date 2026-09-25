'use strict';

// #219: the Desk page title and feature title use the shared ramp without
// re-inverting the h1/h2 hierarchy. Rendered widths are checked in browser QA.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.css'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'club.css'), 'utf8');
const cabinetCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'cabinet.css'), 'utf8');
const afterHours = fs.readFileSync(path.join(__dirname, '..', 'src', 'after-hours.css'), 'utf8');

function tokenSteps(name) {
  const values = [...appCss.matchAll(new RegExp(`--text-${name}:\\s*(\\d+)px`, 'g'))].map((match) =>
    Number(match[1]),
  );
  assert.ok(values.length, `type token --text-${name} is defined`);
  return values;
}

test('shared type ramp has the approved desktop and phone steps', () => {
  for (const [name, expected] of Object.entries({
    display: [44, 40],
    h1: [36, 32],
    h2: [28, 25],
    h3: [22, 20],
    body: [16],
    meta: [13],
    eyebrow: [11],
  })) {
    assert.deepEqual(tokenSteps(name), expected, `--text-${name}`);
  }
  for (let i = 0; i < 2; i++)
    assert.ok(tokenSteps('h1')[i] >= tokenSteps('h2')[i], 'page h1 must be >= feature h2');
});

test('Desk and shared headings consume their role tokens', () => {
  assert.match(css, /\.club-welcome h1 \{[^}]*font-size: var\(--text-h1\)/s);
  // The winning hero rule lives in after-hours.css (later in the bundle than club.css).
  assert.match(afterHours, /\.hero-copy h2 \{[^}]*font-size: var\(--text-h2\)/s);
  assert.match(css, /\.club-section-head h2 \{[^}]*font-size: var\(--text-h2\)/s);
  assert.match(css, /\.gamecard-copy h3 \{[^}]*font-size: var\(--text-h3\)/s);
  assert.match(appCss, /\.section-head h2 \{[^}]*font-size: var\(--text-h2\)/s);
  assert.equal(
    [...appCss.matchAll(/\.section-head h2 \{/g)].length,
    1,
    'later responsive rules must not override the shared section heading token',
  );
  assert.doesNotMatch(
    cabinetCss,
    /\.section-head h2 \{/,
    'cabinet CSS must not override core headings',
  );
  assert.match(appCss, /\.book-info h3 \{[^}]*font-size: var\(--text-h3\)/s);
  assert.doesNotMatch(
    css,
    /\.hero-copy h2 \{[^}]*font-size:/s,
    'club.css must not carry a dead hero font-size overridden by after-hours.css',
  );
});
