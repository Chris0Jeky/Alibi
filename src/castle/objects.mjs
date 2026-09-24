import objectData from './object-data.mjs';

const OBJECT_FIELDS = [
  'schema',
  'id',
  'room',
  'title',
  'visibility',
  'detailAsset',
  'description',
  'actions',
];
const ROOM_OPEN = Object.freeze({ kind: 'room-open' });
const INSPECT = Object.freeze(['inspect']);
const NOTE = Object.freeze(['inspect', 'note']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTIVE_TEXT = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function exactFields(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error(`${label} must be a plain object.`);
  const keys = Object.keys(value);
  const unknown = keys.find((field) => !fields.includes(field));
  if (unknown) throw Error(`${label} has an unknown field: ${unknown}.`);
  const missing = fields.find((field) => !Object.hasOwn(value, field));
  if (missing) throw Error(`${label} is missing field: ${missing}.`);
}

function boundedText(value, label, maximum) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > maximum ||
    value !== value.trim() ||
    ACTIVE_TEXT.test(value)
  )
    throw Error(`${label} must be bounded plain text.`);
  return value;
}

function inspectActions(value) {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 2 ||
    new Set(value).size !== value.length ||
    !value.includes('inspect') ||
    value.some((action) => action !== 'inspect' && action !== 'note')
  )
    throw Error('Inspectable actions must contain unique permitted actions including inspect.');
  return value.includes('note') ? NOTE : INSPECT;
}

function detailAsset(value) {
  if (value !== null)
    throw Error('Inspectable detail artwork is not supported by the Castle release manifest.');
  return null;
}

export function validateInspectableObject(value) {
  exactFields(value, OBJECT_FIELDS, 'Inspectable object');
  if (value.schema !== 1) throw Error('Inspectable object schema must be 1.');
  if (typeof value.id !== 'string' || value.id.length > 80 || !SLUG.test(value.id))
    throw Error('Inspectable object id must be a bounded lowercase slug.');
  if (typeof value.room !== 'string' || value.room.length > 80 || !SLUG.test(value.room))
    throw Error('Inspectable object room must be a bounded lowercase slug.');
  exactFields(value.visibility, ['kind'], 'Inspectable visibility');
  if (value.visibility.kind !== 'room-open')
    throw Error('Inspectable visibility must use the room-open rule.');
  return Object.freeze({
    schema: 1,
    id: value.id,
    room: value.room,
    title: boundedText(value.title, 'Inspectable object title', 120),
    visibility: ROOM_OPEN,
    detailAsset: detailAsset(value.detailAsset),
    description: boundedText(value.description, 'Inspectable object description', 600),
    actions: inspectActions(value.actions),
  });
}

export function validateAuthoredCollection(values) {
  const seen = new Set();
  for (const raw of values) {
    const value = validateInspectableObject(raw);
    const key = `${value.room}/${value.id}`;
    if (seen.has(key)) throw Error(`Duplicate inspectable object: ${key}.`);
    seen.add(key);
  }
  return values;
}

const objects = Object.freeze(
  objectData.map(([id, room, title, description]) => {
    return Object.freeze({
      schema: 1,
      id,
      room,
      title,
      visibility: ROOM_OPEN,
      detailAsset: null,
      description,
      actions: NOTE,
    });
  }),
);
export const authoredObjects = objects;

export function roomObjects(id) {
  return objects.filter((object) => object.room === id);
}

export function inspectObject(id, room) {
  return objects.find((object) => object.id === id && object.room === room);
}

export function appendObservation(notes, object) {
  const line = `${object.title}: ${object.description}`;
  if (notes.split('\n').includes(line))
    return { notes, added: false, message: 'That observation is already in your notebook.' };
  const next = notes ? `${notes}\n\n${line}` : line;
  if (next.length > 12000)
    return {
      notes,
      added: false,
      message: 'The notebook is full. Export or shorten a note before adding this one.',
    };
  return { notes: next, added: true, message: 'Observation added to your notebook.' };
}
