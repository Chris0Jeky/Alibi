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
  for (let i = 0; i < 2; i++) {
    const h1 = tokenSteps('h1')[i];
    const h2 = tokenSteps('h2')[i];
    const h3 = tokenSteps('h3')[i];
    assert.ok(h1 >= h2 && h2 >= h3, `approved h1 >= h2 >= h3 at breakpoint ${i}`);
  }
});

function winningFontSize(body) {
  let size = null;
  for (const match of body.matchAll(/(?:^|[\n;])\s*(font-size|font)\s*:\s*([^;]+)/g)) {
    const prop = match[1];
    const value = match[2].trim();
    if (prop === 'font-size') {
      size = value.replace(/\s*!important\s*$/, '').trim();
      continue;
    }
    const parts = value.split('/')[0].trim().split(/\s+/);
    size = parts[parts.length - 1];
  }
  return size;
}

test('Desk theatre stage h3 rules use the shared token under the page title', () => {
  const theatreCss = fs
    .readFileSync(path.join(__dirname, '..', 'src', 'theatre.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...theatreCss.matchAll(/\.theatre-stage-copy h3\s*\{([^}]*)\}/g)];
  assert.ok(rules.length >= 1, 'stage h3 rule exists');
  for (const [, body] of rules) {
    assert.equal(winningFontSize(body), 'var(--text-h3)');
    assert.match(body, /Georgia,\s*serif/, 'stage titles keep the display face');
    assert.match(body, /line-height:\s*1\.05/, 'stage titles keep the display line-height');
    assert.doesNotMatch(body, /clamp\(|font-size:\s*\d+px/);
  }
  const [h1, h2, h3] = ['h1', 'h2', 'h3'].map((name) => tokenSteps(name));
  assert.deepEqual(
    [h1.length, h2.length, h3.length],
    [2, 2, 2],
    'desktop and phone steps',
  );
  for (let i = 0; i < 2; i++) {
    assert.ok(h1[i] >= h2[i] && h2[i] >= h3[i], `h1 >= h2 >= h3 at breakpoint ${i}`);
  }
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
