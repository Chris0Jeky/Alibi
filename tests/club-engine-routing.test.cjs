'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../src/club-engines.js');
const text = fs.readFileSync(require.resolve('../src/club.js'), 'utf8');
const source = text.slice(text.indexOf('function currentGame('), text.indexOf('function heading('));
const spec = {
  duel: ['reversi', {}], tictactoe: ['tictactoe', {}],
  blockcabinet: ['blockCabinet', { seed: 'BLOCK-01' }],
  regiongardens: ['regionGardens', { level: 0 }],
  dominoes: ['dominoes', { seed: 'DOMINO-01' }],
  mahjong: ['mahjong', { seed: 'MAHJONG-01' }],
  borough: ['borough', { seed: 'EVENING-01' }],
  archive: ['warehouse', { level: 0 }],
};
for (const [id, [engine, options]] of Object.entries(spec)) {
  test(`${id}: host routing retains its engine and seed or level`, () => {
    const run = { ...options, log: [], redo: [] };
    const context = vm.createContext({ state: { runs: { [id]: run } }, E: () => E });
    vm.runInContext(source + '\nthis.read = currentGame;', context);
    let expected;
    if (id === 'tictactoe') expected = E[engine].replay(run.log);
    else if (id === 'duel') expected = E[engine].initial();
    else if (id === 'archive') expected = E[engine].initial(run.level);
    else expected = E[engine].replay(run.seed ?? run.level, run.log);
    assert.deepEqual(JSON.parse(JSON.stringify(context.read(id))), JSON.parse(JSON.stringify(expected)));
    assert.equal(context.read('not-a-game'), null);
    assert.deepEqual(run.log, [], 'routing never mutates the journal input');
  });
}
