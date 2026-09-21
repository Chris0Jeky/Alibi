import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authoredObjects,
  roomObjects,
  inspectObject,
  appendObservation,
  validateInspectableObject,
} from '../src/castle/objects.mjs';

test('Inspectable objects expose one strict, immutable data contract', () => {
  const object = roomObjects('library')[0];
  assert.deepEqual(Object.keys(object).sort(), [
    'actions',
    'description',
    'detailAsset',
    'id',
    'room',
    'schema',
    'title',
    'visibility',
  ]);
  assert.equal(object.schema, 1);
  assert.deepEqual(object.visibility, { kind: 'room-open' });
  assert.equal(object.detailAsset, null);
  assert.deepEqual(object.actions, ['inspect', 'note']);
  assert.equal(Object.isFrozen(object), true);
  assert.equal(Object.isFrozen(object.visibility), true);
  assert.equal(Object.isFrozen(object.actions), true);
});

test('The authored collection passes the strict validator', () => {
  assert.equal(authoredObjects.length, 9);
  assert.doesNotThrow(() => authoredObjects.map(validateInspectableObject));
});

test('Inspectable object validation rejects active markup, detail art and unknown fields', () => {
  const valid = {
    schema: 1,
    id: 'library-pencil',
    room: 'library',
    title: 'A pencilled correction',
    visibility: { kind: 'room-open' },
    detailAsset: null,
    description: 'A catalogue card bears a correction.',
    actions: ['inspect', 'note'],
  };
  assert.doesNotThrow(() => validateInspectableObject(valid));
  assert.throws(
    () => validateInspectableObject({ ...valid, description: '<script>alert(1)</script>' }),
    /plain text/i,
  );
  assert.throws(
    () =>
      validateInspectableObject({
        ...valid,
        detailAsset: { src: 'https://example.invalid/detail.webp', alt: 'Remote detail' },
      }),
    /release manifest/i,
  );
  assert.throws(
    () =>
      validateInspectableObject({
        ...valid,
        detailAsset: { src: './assets/detail.webp', alt: 'Local detail' },
      }),
    /release manifest/i,
  );
  assert.throws(() => validateInspectableObject({ ...valid, onclick: 'bad()' }), /unknown field/i);
  assert.throws(
    () => validateInspectableObject({ ...valid, actions: ['inspect', 'execute-script'] }),
    /permitted action/i,
  );
});

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
