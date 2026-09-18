const OBJECT_FIELDS = Object.freeze([
  'schema',
  'id',
  'room',
  'title',
  'visibility',
  'detailAsset',
  'description',
  'actions',
]);
const VISIBILITY_FIELDS = Object.freeze(['kind']);
const ASSET_FIELDS = Object.freeze(['src', 'alt']);
const PERMITTED_ACTIONS = Object.freeze(['inspect', 'note']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCAL_ASSET = /^\.\/assets\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function exactFields(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error(`${label} must be a plain object.`);
  const unknown = Object.keys(value).filter((field) => !fields.includes(field));
  if (unknown.length) throw Error(`${label} has an unknown field: ${unknown.join(', ')}.`);
  const missing = fields.filter((field) => !Object.hasOwn(value, field));
  if (missing.length) throw Error(`${label} is missing field: ${missing.join(', ')}.`);
}

function boundedPlainText(value, label, maximum) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw Error(`${label} must be bounded plain text.`);
  return value;
}

function slug(value, label) {
  if (typeof value !== 'string' || value.length > 80 || !SLUG.test(value))
    throw Error(`${label} must be a bounded lowercase slug.`);
  return value;
}

function visibility(value) {
  exactFields(value, VISIBILITY_FIELDS, 'Inspectable visibility');
  if (value.kind !== 'room-open')
    throw Error('Inspectable visibility must use the room-open rule.');
  return Object.freeze({ kind: value.kind });
}

function detailAsset(value) {
  if (value === null) return null;
  exactFields(value, ASSET_FIELDS, 'Inspectable detail asset');
  if (typeof value.src !== 'string' || !LOCAL_ASSET.test(value.src) || value.src.includes('..'))
    throw Error('Inspectable detail artwork must name a local asset under ./assets/.');
  return Object.freeze({
    src: value.src,
    alt: boundedPlainText(value.alt, 'Inspectable detail asset alt text', 240),
  });
}

function actions(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > PERMITTED_ACTIONS.length)
    throw Error('Inspectable actions must contain one or more permitted actions.');
  if (new Set(value).size !== value.length)
    throw Error('Inspectable actions cannot repeat a permitted action.');
  for (const action of value)
    if (!PERMITTED_ACTIONS.includes(action))
      throw Error(`Inspectable action ${String(action)} is not a permitted action.`);
  if (!value.includes('inspect'))
    throw Error('Inspectable actions must include the permitted inspect action.');
  return Object.freeze(PERMITTED_ACTIONS.filter((action) => value.includes(action)));
}

export function validateInspectableObject(value) {
  exactFields(value, OBJECT_FIELDS, 'Inspectable object');
  if (value.schema !== 1) throw Error('Inspectable object schema must be 1.');
  return Object.freeze({
    schema: 1,
    id: slug(value.id, 'Inspectable object id'),
    room: slug(value.room, 'Inspectable object room'),
    title: boundedPlainText(value.title, 'Inspectable object title', 120),
    visibility: visibility(value.visibility),
    detailAsset: detailAsset(value.detailAsset),
    description: boundedPlainText(value.description, 'Inspectable object description', 600),
    actions: actions(value.actions),
  });
}

const objects = Object.freeze(
  [
    {
      schema: 1,
      id: 'gate-hinge',
      room: 'gatehouse',
      title: 'The lower hinge',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'A fresh smear of oil follows an old groove in the stone. The keeper still has to lift the door to close it.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'library-pencil',
      room: 'library',
      title: 'A pencilled correction',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'Someone crossed out a shelf number, then wrote it back in. The catalogue card has worn thin beneath the eraser.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'clock-instrument',
      room: 'observatory',
      title: 'The instrument case',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'The velvet is faded except where the instrument rested. Finch pencilled his calibration method inside the lid.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'map-seam',
      room: 'cartography',
      title: 'The joined sheets',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'Two survey sheets meet at the orchard. The folds agree, but the newer ink does not quite reach the edge.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'orangery-pane',
      room: 'orangery',
      title: 'The replaced pane',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'One pane makes the garden look slightly wider. Move your eye to the next pane and the path narrows again.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'workshop-disk',
      room: 'workshop',
      title: 'The smallest disk',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'A narrow split has been glued shut. The wood around it is polished by years of handling.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'study-report',
      room: 'study',
      title: 'The report’s binding',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'The title is stamped in gold. Along the bottom edge, damp has lifted the cloth from the board.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'stair-mark',
      room: 'west-stair',
      title: 'A mark on the plaster',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'A short line has been cut beside the doorframe. There is no date or name beside it.',
      actions: ['inspect', 'note'],
    },
    {
      schema: 1,
      id: 'conservatory-pencil',
      room: 'conservatory',
      title: 'The guest-book pencil',
      visibility: { kind: 'room-open' },
      detailAsset: null,
      description:
        'Its point is uneven. The keeper has left the shavings in a saucer rather than interrupt a conversation to find a bin.',
      actions: ['inspect', 'note'],
    },
  ].map(validateInspectableObject),
);

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
