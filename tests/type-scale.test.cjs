'use strict';

// #219: Library-only components use the ramp in their existing rules.
// Shared room typography stays outside this slice.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
const sources = Object.fromEntries(
  ['app.css', 'cabinet.css', 'curation.css'].map((file) => [
    file,
    read(file).replace(/\/\*[\s\S]*?\*\//g, ''),
  ]),
);
const contract = {
  'app.css': {
    body: ['.family-intro p'],
    meta: [
      '.family-intro .btn',
      '.search-field input',
      '.filter-top select',
      '.filter-meta',
      '.family-card .family-count',
      '.cover-note',
    ],
  },
  'cabinet.css': {
    meta: ['.family-count', '.filter-meta', '.cover-note'],
  },
  'curation.css': {
    body: [
      '.curation-collections summary',
      '.curation-collections > summary',
      '.curation-gallery > summary',
      '.collection-intro',
    ],
    meta: [
      '.collection-scope',
      '.disclosure-hint',
      '.curation-gallery figcaption',
      '.filters .filter-meta',
      '.filter-top select',
      '.filter-top input',
    ],
  },
};

for (const [file, roles] of Object.entries(contract)) {
  test(`${file}: Library selectors use their ramp tokens without breakpoint overrides`, () => {
    const rules = [...sources[file].matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    assert.doesNotMatch(
      sources[file],
      /\.main:has\(#library-browse-all/,
      'no duplicate Library overrides',
    );
    for (const [role, selectors] of Object.entries(roles)) {
      for (const selector of selectors) {
        const matches = rules.filter(([_, head]) => head.trim().split(/,\s*/).includes(selector));
        assert.ok(matches.length, `${selector} needs an explicit Library mapping`);
        let declarations = 0;
        for (const [, , body] of matches) {
          const sizes = [...body.matchAll(/\bfont-size:\s*([^;]+);/g)].map((m) => m[1]);
          declarations += sizes.length;
          if (sizes.length)
            assert.deepEqual(
              sizes,
              [`var(--text-${role})`],
              `${file}: ${selector} must use ${role} at every breakpoint`,
            );
          assert.doesNotMatch(body, /(?:^|;)\s*font\s*:/, 'shorthands must not reset the size');
        }
        assert.ok(declarations, `${selector} needs a token declaration`);
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
