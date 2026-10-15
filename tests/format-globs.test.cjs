'use strict';

// Pins the widened prettier globs: format and format:check must descend into
// tool/test subdirectories (tools/assets, tools/curation, tests/helpers,
// tests/quiet-wing), not just the top-level files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

const EXPECTED_GLOBS = ['tools/**/*.cjs', 'tests/**/*.cjs', 'tests/**/*.mjs'];
const RETIRED_GLOBS = ['tools/*.cjs', 'tests/*.cjs', 'tests/*.mjs'];

// Sample files proving each covered subtree; top-level files prove `**`
// still matches zero intermediate directories, as prettier/fast-glob does.
const COVERED_SAMPLES = [
  'tools/build.cjs',
  'tools/assets/catalogue.cjs',
  'tools/curation/vault-quality.cjs',
  'tests/format-globs.test.cjs',
  'tests/helpers/club-session.cjs',
  'tests/quiet-wing/engines.cjs',
];

function quotedGlobs(script) {
  return [...script.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          source += '(.*/)?';
          i += 2;
        } else {
          source += '.*';
          i += 1;
        }
      } else {
        source += '[^/]*';
      }
    } else if ('+?^${}()|[]\\.'.includes(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`);
}

function readScripts() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return { format: pkg.scripts.format, check: pkg.scripts['format:check'] };
}

test('format and format:check share the widened tool/test globs', () => {
  const { format, check } = readScripts();
  for (const script of [format, check]) {
    for (const glob of EXPECTED_GLOBS) {
      assert.ok(script.includes(`"${glob}"`), `expected ${glob} in: ${script}`);
    }
    for (const glob of RETIRED_GLOBS) {
      assert.ok(
        !script.includes(`"${glob}"`),
        `retired single-star glob ${glob} still in: ${script}`,
      );
    }
  }
  assert.deepEqual(
    quotedGlobs(format).sort(),
    quotedGlobs(check).sort(),
    'format and format:check drifted apart',
  );
});

test('format:check globs match every tool/test subtree sample', () => {
  const { check } = readScripts();
  const matchers = quotedGlobs(check).map(globToRegExp);
  for (const sample of COVERED_SAMPLES) {
    assert.ok(fs.existsSync(path.join(root, sample)), `coverage sample is missing: ${sample}`);
    assert.ok(
      matchers.some((matcher) => matcher.test(sample)),
      `${sample} is not matched by any format:check glob`,
    );
  }
});
