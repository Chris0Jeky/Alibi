'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = fs.readFileSync(
  path.join(__dirname, '../.github/workflows/workshop-discovery.yml'),
  'utf8',
);

// Match the positive path patterns used by this workflow, including directory globs.
function matches(pattern, file) {
  const re = pattern
    .split(/(\*\*|\*)/)
    .map((part) =>
      part === '**' ? '.*' : part === '*' ? '[^/]*' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${re}$`).test(file);
}

test('adder-only changes trigger the collection discovery pull-request workflow', () => {
  const section = workflow.match(/^  pull_request:\n    paths:\n((?:      - [^\n]+\n)+)/m);
  assert.ok(section, 'collection workflow must retain pull-request path filters');
  const patterns = [...section[1].matchAll(/^      - ['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  for (const file of [
    'src/workshop-add.mjs',
    'tests/workshop-add.test.mjs',
    'tests/workshop_add_browser.py',
  ])
    assert.ok(
      patterns.some((pattern) => matches(pattern, file)),
      `${file} must trigger discovery`,
    );
});

test('collection discovery runs the adder Node tests', () => {
  const commands = [...workflow.matchAll(/^\s*node --test\s+([^\n]+)/gm)];
  assert.ok(
    commands.some((match) =>
      match[1].split(/\s+/).some((pattern) => matches(pattern, 'tests/workshop-add.test.mjs')),
    ),
    'the collection workflow must select the adder Node suite',
  );
});
