import objectData from './object-data.mjs';

const objects = objectData.map(([id, room, title, description]) => ({
  id,
  room,
  n: title,
  t: description,
  a: 1,
}));

export function roomObjects(id) {
  return objects.filter((object) => object.room === id);
}

export function inspectObject(id, room) {
  return objects.find((object) => object.id === id && object.room === room);
}

export function appendObservation(notes, object) {
  const line = `${object.n}: ${object.t}`;
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
