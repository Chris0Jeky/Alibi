'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'browser_observatory.py'), 'utf8');
const callback = source.match(/conflict = page\.evaluate\(\s*"""([\s\S]*?)"""/)[1];
function select(givens, cells, entry) {
  const run = { puzzle: { givens }, state: { cells } };
  const before = JSON.stringify(run);
  const result = vm.runInNewContext('(' + callback + ')(entry)', {
    entry,
    AlibiDiagnostics: { getCurrent: () => run },
  });
  assert.equal(JSON.stringify(run), before);
  return result ? { ...result } : null;
}
test('conflict fixture can use a column peer when the row is full', () => {
  assert.deepEqual(
    select([0, 2, 3, 4, 5, 6, 0, 8, 9], [1, 2, 3, 4, 5, 6, 0, 8, 9], { index: 0, value: 1 }),
    { index: 6, value: 1 },
  );
});
test('conflict fixture retains the existing empty row peer', () => {
  assert.deepEqual(
    select([0, 0, 3, 4, 5, 6, 7, 8, 9], [1, 0, 3, 4, 5, 6, 7, 8, 9], { index: 0, value: 1 }),
    { index: 1, value: 1 },
  );
});
test('no available peer fails a clear precondition rather than indexing null', () => {
  assert.equal(
    select([0, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9], { index: 0, value: 1 }),
    null,
  );
  const guard = source.indexOf('check(conflict is not None,');
  const use = source.indexOf('conflict["index"]');
  assert.ok(guard > 0 && guard < use, 'assert the fixture precondition before using its index');
});
