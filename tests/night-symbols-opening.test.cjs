'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const pack = require('../content/extra/night-symbols.json');
const notes = require('../content/curation/editorial/night-symbols.json');

test('Night Symbols opening names the actual pair of printed symbols', () => {
  const id = 'night-study-binary-01';
  const puzzle = pack.puzzles.find((p) => p.id === id);
  const note = notes.studies.find((n) => n.id === id);
  for (const text of [note.structuralDistinction, note.intendedReasoningPath[0]]) {
    const pair = text.match(/The two (suns|moons) at ([A-Z])(\d+)\/([A-Z])(\d+)/);
    assert.ok(pair, 'the opening must identify its two printed symbols');
    const value = pair[1] === 'suns' ? 0 : 1;
    for (const offset of [2, 4]) {
      const col = pair[offset].charCodeAt(0) - 65;
      const row = Number(pair[offset + 1]) - 1;
      assert.ok(row >= 0 && row < puzzle.size && col >= 0 && col < puzzle.size);
      assert.equal(puzzle.givens[row * puzzle.size + col], value, text);
    }
  }
});
