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
const LOCAL_ASSET = /^\.\/assets\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;
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
  if (value === null) return null;
  exactFields(value, ['src', 'alt'], 'Inspectable detail asset');
  if (typeof value.src !== 'string' || value.src.includes('..') || !LOCAL_ASSET.test(value.src))
    throw Error('Inspectable detail artwork must name a local asset under ./assets/.');
  return Object.freeze({
    src: value.src,
    alt: boundedText(value.alt, 'Inspectable detail asset alt text', 240),
  });
}

// Exported for authoring/build verification. The Castle runtime imports only the
// query helpers below, so the generic validator is tree-shaken from the player bundle.
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

const objects = Object.freeze(
  [
    [
      'gate-hinge',
      'gatehouse',
      'The lower hinge',
      'A fresh smear of oil follows an old groove in the stone. The keeper still has to lift the door to close it.',
    ],
    [
      'library-pencil',
      'library',
      'A pencilled correction',
      'Someone crossed out a shelf number, then wrote it back in. The catalogue card has worn thin beneath the eraser.',
    ],
    [
      'clock-instrument',
      'observatory',
      'The instrument case',
      'The velvet is faded except where the instrument rested. Finch pencilled his calibration method inside the lid.',
    ],
    [
      'map-seam',
      'cartography',
      'The joined sheets',
      'Two survey sheets meet at the orchard. The folds agree, but the newer ink does not quite reach the edge.',
    ],
    [
      'orangery-pane',
      'orangery',
      'The replaced pane',
      'One pane makes the garden look slightly wider. Move your eye to the next pane and the path narrows again.',
    ],
    [
      'workshop-disk',
      'workshop',
      'The smallest disk',
      'A narrow split has been glued shut. The wood around it is polished by years of handling.',
    ],
    [
      'study-report',
      'study',
      'The report’s binding',
      'The title is stamped in gold. Along the bottom edge, damp has lifted the cloth from the board.',
    ],
    [
      'stair-mark',
      'west-stair',
      'A mark on the plaster',
      'A short line has been cut beside the doorframe. There is no date or name beside it.',
    ],
    [
      'conservatory-pencil',
      'conservatory',
      'The guest-book pencil',
      'Its point is uneven. The keeper has left the shavings in a saucer rather than interrupt a conversation to find a bin.',
    ],
  ].map(([id, room, title, description]) =>
    Object.freeze({
      schema: 1,
      id,
      room,
      title,
      visibility: ROOM_OPEN,
      detailAsset: null,
      description,
      actions: NOTE,
    }),
  ),
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
