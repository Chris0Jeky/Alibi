const objects = [
  {
    id: 'gate-hinge',
    room: 'gatehouse',
    title: 'The lower hinge',
    text: 'A fresh smear of oil follows an old groove in the stone. The keeper still has to lift the door to close it.',
  },
  {
    id: 'library-pencil',
    room: 'library',
    title: 'A pencilled correction',
    text: 'Someone crossed out a shelf number, then wrote it back in. The catalogue card has worn thin beneath the eraser.',
  },
  {
    id: 'clock-instrument',
    room: 'observatory',
    title: 'The instrument case',
    text: 'The velvet is faded except where the instrument rested. Finch pencilled his calibration method inside the lid.',
  },
  {
    id: 'map-seam',
    room: 'cartography',
    title: 'The joined sheets',
    text: 'Two survey sheets meet at the orchard. The folds agree, but the newer ink does not quite reach the edge.',
  },
  {
    id: 'orangery-pane',
    room: 'orangery',
    title: 'The replaced pane',
    text: 'One pane makes the garden look slightly wider. Move your eye to the next pane and the path narrows again.',
  },
  {
    id: 'workshop-disk',
    room: 'workshop',
    title: 'The smallest disk',
    text: 'A narrow split has been glued shut. The wood around it is polished by years of handling.',
  },
  {
    id: 'study-report',
    room: 'study',
    title: 'The report’s binding',
    text: 'The title is stamped in gold. Along the bottom edge, damp has lifted the cloth from the board.',
  },
  {
    id: 'stair-mark',
    room: 'west-stair',
    title: 'A mark on the plaster',
    text: 'A short line has been cut beside the doorframe. There is no date or name beside it.',
  },
  {
    id: 'conservatory-pencil',
    room: 'conservatory',
    title: 'The guest-book pencil',
    text: 'Its point is uneven. The keeper has left the shavings in a saucer rather than interrupt a conversation to find a bin.',
  },
];
export function roomObjects(id) {
  return objects.filter((object) => object.room === id);
}
export function inspectObject(id, room) {
  return objects.find((object) => object.id === id && object.room === room);
}
export function appendObservation(notes, object) {
  const line = `${object.title}: ${object.text}`;
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
