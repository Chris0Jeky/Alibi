'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const AlibiCore = require('../src/core.js');

const puzzle = {
  size: 4,
  roomNames: ['Lounge', 'Kitchen', 'Study', 'Garden room'],
  rooms: [0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0],
  people: [
    { id: 'june', name: 'June', role: 'A guest', color: 0 },
    { id: 'miles', name: 'Miles', role: 'A guest', color: 1 },
    { id: 'ada', name: 'Ada', role: 'A guest', color: 2 },
    { id: 'victim', name: 'Ellis', role: 'The victim', color: 3 },
  ],
  objects: [],
  victim: 'victim',
  clues: [{ kind: 'room', who: 'victim', value: 2 }],
};

function scene() {
  return { june: 13, miles: 3, ada: 6, victim: 8 };
}

function validateScene(placements) {
  return AlibiCore.registry.scene.validate(puzzle, { placements });
}

const VICTIM_ROOM_ISSUE = 'The victim must share a room with exactly one suspect.';

test('victim shares a room with exactly one suspect', () => {
  assert.deepEqual(validateScene(scene()), []);
});

test('victim alone in a room is rejected', () => {
  const issues = validateScene({ june: 14, miles: 1, ada: 7, victim: 8 });
  assert.ok(
    issues.some((issue) => issue.message === VICTIM_ROOM_ISSUE),
    'expected the victim-room issue when no suspect shares the Study',
  );
});

test('victim sharing with two suspects is rejected', () => {
  const issues = validateScene({ june: 13, miles: 2, ada: 7, victim: 8 });
  assert.ok(
    issues.some((issue) => issue.message === VICTIM_ROOM_ISSUE),
    'expected the victim-room issue when two suspects share the Study',
  );
});
