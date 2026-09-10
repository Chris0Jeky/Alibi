import test from 'node:test';
import assert from 'node:assert/strict';
import { roomObjects, inspectObject, appendObservation } from '../src/castle/objects.mjs';

test('An object belongs to its room; observations do not grant puzzle rewards', () => {
  const object = roomObjects('library')[0];
  assert.equal(inspectObject(object.id, 'library'), object);
  assert.equal(inspectObject(object.id, 'study'), undefined);
  assert.deepEqual(roomObjects('unknown'), []);
  const first = appendObservation('', object);
  assert.equal(first.added, true);
  assert.equal(appendObservation(first.notes, object).added, false);
});

test('A full notebook keeps the existing text without truncating an observation', () => {
  const notes = 'a'.repeat(12000);
  const result = appendObservation(notes, roomObjects('library')[0]);
  assert.equal(result.added, false);
  assert.equal(result.notes, notes);
});
