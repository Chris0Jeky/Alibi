'use strict';
// Pin: challenge-launcher settle auto-plays Ink replies along principalVariation,
// and mount rejects saves from another challenge.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const PV = [7, 19];

let bestCalls = 0;
globalThis.AlibiClubEngines = {
  reversi: {
    strengths: { expert: { depth: 1 } },
    best: () => {
      bestCalls += 1;
      return { cell: 99 };
    },
    score: () => null,
    legal: () => [],
  },
};

const L = require('../src/challenge-launcher.js');

function stubRegistry(onReplay) {
  return {
    replay(run) {
      if (onReplay) onReplay();
      const complete = run.log.length >= PV.length;
      // Ink is to move right after Gold's opening move; otherwise Gold is to move.
      const inkToMove = run.log.length === 1;
      return {
        challenge: { family: 'reversi', principalVariation: PV },
        state: { turn: inkToMove ? -1 : 1, done: complete, board: Array(36).fill(0) },
        complete,
      };
    },
    validateRun: (saved) => saved,
    begin: (id) => ({ challengeId: id, log: [] }),
    get: (id) => ({
      id,
      family: 'reversi',
      instruction: 'Gold to move.',
      principalVariation: PV,
      solutionFirstMove: PV[0],
    }),
    entries: () => [{ id: 'challenge-a', family: 'reversi' }],
  };
}

function host() {
  return {
    innerHTML: '',
    replaceChildren() {
      this.innerHTML = '';
    },
    getRootNode: () => ({ activeElement: null }),
    contains: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

test('Ink auto-replies follow the recorded line and replay completes without hanging', () => {
  bestCalls = 0;
  let replays = 0;
  const registry = stubRegistry(() => {
    replays += 1;
    assert.ok(replays < 50, 'settle terminates instead of replaying forever');
  });
  const run = { log: [PV[0]] };
  const settled = L.settle(registry, run);
  assert.equal(settled, run, 'settle resolves in place');
  assert.deepEqual(run.log, PV, 'Ink reply follows principalVariation');
  assert.equal(bestCalls, 0, 'on-line reply does not fall back to search');
  assert.equal(registry.replay(run).complete, true, 'replay completes after the reply');
  assert.ok(replays <= 5, `bounded replays, saw ${replays}`);
});

test('mount throws on a save from another challenge', () => {
  const registry = stubRegistry();
  const foreign = { challengeId: 'challenge-b', log: [] };
  assert.throws(
    () => L.mount(host(), registry, 'challenge-a', foreign),
    /another challenge/,
  );
});
