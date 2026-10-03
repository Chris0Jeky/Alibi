'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./browser_challenge_ownership.py'), 'utf8');
const waits = [...source.matchAll(/wait_for_function\(\s*'([^'\n]+)'/g)]
  .map((match) => match[1])
  .filter((expression) => expression.includes('.inert'));

for (const [index, expression] of waits.entries()) {
  test(`restore readiness ${index + 1}: use the actual connected shadow host, not the document`, () => {
    // The real host belongs to a ShadowRoot, so document.querySelector returns null.
    const probe = {};
    const predicate = vm.runInNewContext(expression, {
      document: { querySelector: () => null },
      ownershipProbe: probe,
    });
    assert.doesNotThrow(() => predicate(), 'boot before mounting is not ready, not an exception');
    assert.equal(predicate(), false);
    probe.host = { isConnected: true, inert: false };
    assert.equal(predicate(), false, 'the host alone is not a mounted board');
    probe.current = { save: () => ({ log: [1, 2] }), wasDisposed: false };
    assert.equal(predicate(), true);
    probe.host.isConnected = false;
    assert.equal(predicate(), false, 'a detached earlier route cannot satisfy readiness');
    probe.host.isConnected = true;
    probe.host.inert = true;
    assert.equal(predicate(), false, 'an admitted restore must still block readiness');
    probe.host.inert = false;
    probe.current.wasDisposed = true;
    assert.equal(predicate(), false, 'a disposed handle cannot satisfy readiness');
    probe.current.wasDisposed = false;
    if (expression.includes('log.length')) {
      probe.current.save = () => ({ log: [] });
      assert.equal(predicate(), false, 'the imported log still has to be restored');
    } else {
      probe.kept = probe.current;
      assert.equal(predicate(), false, 'the previous handle still has to be replaced');
    }
  });
}

test('both real restore readiness call sites stay covered', () => {
  assert.equal(waits.length, 2);
});
