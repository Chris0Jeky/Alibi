'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const text = fs.readFileSync(require.resolve('../src/club.js'), 'utf8');
const source = text.slice(text.indexOf('function ensureRun('), text.indexOf('function currentGame('));
const defaults = { duel: { mode: 'bot' }, tictactoe: { mode: 'bot' }, blockcabinet: { seed: 'BLOCK-01' }, dominoes: { seed: 'DOMINO-01' }, mahjong: { seed: 'MAHJONG-01' }, borough: { seed: 'EVENING-01' }, regiongardens: { level: 0 }, archive: { level: 0 } };
function fixture(available = true) {
  const context = vm.createContext({ E: () => available, state: { runs: {} } });
  vm.runInContext(source + '\nthis.ensure = ensureRun;', context);
  return context;
}
for (const [id, expected] of Object.entries(defaults)) {
  test(`${id}: initial run values and existing run ownership remain unchanged`, () => {
    const f = fixture(); f.ensure(id);
    assert.deepEqual(JSON.parse(JSON.stringify(f.state.runs[id])), { ...expected, log: [], redo: [] });
    const run = f.state.runs[id]; run.log.push('retained'); f.ensure(id);
    assert.equal(f.state.runs[id], run);
    f.ensure(Object.keys(defaults).find((other) => other !== id));
    assert.equal(run.log.length, 1, 'different games do not share mutable logs');
  });
}
test('unknown IDs, prototype names and unavailable engines create no run', () => {
  const f = fixture();
  for (const id of ['unknown', '__proto__', 'constructor', 'toString', '']) f.ensure(id);
  assert.deepEqual(Object.keys(f.state.runs), []);
  const absent = fixture(false); absent.ensure('blockcabinet');
  assert.deepEqual(Object.keys(absent.state.runs), []);
});
