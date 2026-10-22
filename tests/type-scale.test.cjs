'use strict';

// #219: Library only. The two IDs identify its landing and filtered views;
// shared card/page styles must retain their defaults in other rooms.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
const sources = Object.fromEntries(
  ['app.css', 'cabinet.css'].map((file) => [file, read(file).replace(/\/\*[\s\S]*?\*\//g, '')]),
);
const scope = '.main:has(#library-browse-all, #library-search)';
const contract = {
  'app.css': {
    h1: ['.page-head h1'],
    h2: ['.news-heading h2', '.empty h2'],
    h3: ['.family-card h3', '.card-body h3', '.collection-card-copy strong'],
    body: [
      '.page-head p',
      '.family-card p',
      '.family-intro p',
      '.collection-atmosphere p',
      '.news-heading p',
      '.empty p',
      '.collection-intro',
      '.collection-card-copy > span',
    ],
  },
  'cabinet.css': {
    body: ['.curation-collections summary', '.curation-gallery > summary'],
    meta: [
      '.page-head .btn',
      '.family-intro .btn',
      '.filters .btn',
      '.show-more .btn',
      '.empty .btn',
      '.curation-collections .btn',
      '.chip',
      '.search-field input',
      '.filter-top select',
      '.filter-meta',
      '.family-count',
      '.card-meta',
      '.difficulty',
      '.card-art .badge',
      '.collection-stamp',
      '.collection-scope',
      '.collection-caption',
      '.collection-card-copy b',
      '.disclosure-hint',
      '.curation-gallery figcaption',
      '.collection-atmosphere small',
      '.museum-atmosphere figcaption',
      '.cover-note',
    ],
    eyebrow: ['.eyebrow', '.card-family'],
  },
};

for (const [file, roles] of Object.entries(contract)) {
  test(`${file}: Library selectors use their ramp tokens without breakpoint overrides`, () => {
    const rules = [...sources[file].matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    for (const [role, selectors] of Object.entries(roles)) {
      for (const selector of selectors) {
        const full = `${scope} ${selector}`;
        // Split only between rules' selectors, not the comma inside :has().
        const matches = rules.filter(([_, head]) =>
          head
            .trim()
            .split(/,\s*(?=\.main)/)
            .includes(full),
        );
        assert.ok(matches.length, `${full} needs an explicit Library mapping`);
        for (const [, , body] of matches) {
          assert.deepEqual(
            [...body.matchAll(/\bfont-size:\s*([^;]+);/g)].map((m) => m[1]),
            [`var(--text-${role})`],
            `${file}: ${full} must use ${role} at every breakpoint`,
          );
          assert.doesNotMatch(body, /(?:^|;)\s*font\s*:/, 'shorthands must not reset the size');
        }
      }
    }
  });
}

const names = ['display', 'h1', 'h2', 'h3', 'body', 'meta', 'eyebrow'];
const css = sources['app.css'];
const desktop = css.match(/:root\s*\{([^}]+)\}/)[1];
const phone = css.match(/@media\s*\(max-width:\s*600px\)\s*\{\s*:root\s*\{([^}]+)\}/)[1];
for (const [label, blocks, expected] of [
  ['desktop', [desktop], [44, 36, 28, 22, 16, 13, 11]],
  ['phone (600px and below)', [desktop, phone], [40, 32, 25, 20, 16, 13, 11]],
]) {
  test(`${label}: published ramp values and ordering survive`, () => {
    const values = Object.fromEntries(
      blocks.flatMap((block) =>
        [...block.matchAll(/--text-([a-z0-9]+):\s*(\d+)px;/g)].map((m) => [m[1], Number(m[2])]),
      ),
    );
    assert.deepEqual(
      names.map((name) => values[name]),
      expected,
    );
    for (let i = 1; i < names.length; i++) {
      assert.ok(values[names[i - 1]] >= values[names[i]], `${names[i - 1]} >= ${names[i]}`);
    }
  });
}

test('the shared wordmark retains its deliberate display exception', () => {
  assert.match(read('cabinet.css'), /\/\*[^*]*wordmark[^*]*display exception[^*]*\*\//i);
  assert.match(sources['cabinet.css'], /\.brand \.wordmark\s*\{[^}]*font-size:\s*58px;/);
});
