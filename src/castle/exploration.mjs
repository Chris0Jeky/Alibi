import W from './content.mjs';
import * as E from './engine.mjs';
import { button, escape } from './html.mjs';

// Coordinates share the original room illustration's 1000 by 660 canvas.
const rooms = {
  gatehouse: [
    'Rain on slate. A lantern against wet stone.',
    'Start with constraints, not guesses.',
    ['library', 'museum', 'workshop'],
    [43, 63],
    [34, 77],
  ],
  library: [
    'Low lamps, leather bindings, a long quiet aisle.',
    'Separate what is stated from what you assume.',
    ['gatehouse', 'cartography', 'observatory', 'study'],
    [16, 33],
    [52, 70],
  ],
  observatory: [
    'Copper instruments beneath the night sky.',
    'Calibrate the measure before trusting the number.',
    ['library', 'study'],
    [39, 66],
    [65, 43],
  ],
  cartography: [
    'Folded surveys and a path that runs into the paper’s edge.',
    'Ask which routes the model leaves out.',
    ['library', 'workshop', 'orangery', 'study'],
    [49, 71],
    [17, 35],
  ],
  orangery: [
    'Glass, leaf shadows and the last warmth of the day.',
    'Use the consequences of one choice to constrain the next.',
    ['cartography', 'workshop', 'conservatory'],
    [50, 70],
    [58, 30],
  ],
  museum: [
    'Worn tables. Shallow drawers. Objects you may handle.',
    'Try, notice, explain, then revise the label.',
    ['gatehouse', 'library', 'conservatory'],
    [50, 70],
    [82, 33],
  ],
  workshop: [
    'Polished pegs and a disk carefully mended by hand.',
    'Make a smaller version of the same problem.',
    ['gatehouse', 'cartography', 'orangery'],
    [57, 57],
    [44, 70],
  ],
  study: [
    'Damp cloth binding and the weight of a public verdict.',
    'Possibility is not proof. Keep the difference visible.',
    ['library', 'observatory', 'cartography', 'west-stair'],
    [51, 70],
    [17, 33],
  ],
  'west-stair': [
    'A cold draught rises from beyond the cabinet.',
    'An omitted route changes what is possible, not what is certain.',
    ['study'],
    [39, 29],
    [33, 51],
  ],
  conservatory: [
    'The chair by the glass is warm from the afternoon.',
    'Rest is part of thinking. Leave a question unfinished.',
    ['museum', 'orangery'],
    [51, 70],
    [71, 63],
  ],
};
export function atmosphere(id) {
  const [ambience, method, exits, puzzle, object] = rooms[id] || rooms.gatehouse;
  return { ambience, method, exits, puzzle, object };
}
export const listed = (state, room) => room.id !== 'west-stair' || E.has(state, 'inference');
export function nearby(room, state) {
  return `<nav class="nearby" aria-label="Nearby doors"><h2>From here</h2>${atmosphere(room.id)
    .exits.filter((id) => id !== 'west-stair' || E.has(state, 'inference'))
    .map((id) => {
      const r = W.rooms.find((x) => x.id === id),
        status = E.roomStatus(state, r);
      return button(`${escape(r.name)}${status.open ? ' →' : ' · clue required'}`, 'visit', id);
    })
    .join('')}</nav>`;
}
export function nextThread(state) {
  if (!state.preferences.story)
    return '<p>The museum tables and conservatory are open. Take the visit at your own pace.</p>';
  const steps = [
    ['shelves', 'library', 'Begin with the misfiled maintenance slip in the Long Library.'],
    [
      'clock',
      'observatory',
      'The maintenance slip opens the Observatory. Check the station clock against it.',
    ],
    [
      'route',
      'cartography',
      'Try the Gatehouse question or a museum object to open the Map Room. Then test the route.',
    ],
    [
      'inference',
      'study',
      'Bring the corrected time and route to the Keeper’s Study. What do they actually establish?',
    ],
  ];
  const step = steps.find(([id]) => !E.has(state, id));
  return step
    ? `<p>${escape(step[2])}</p>${button('Follow this thread', 'visit', step[1])}`
    : `<p>The unrecorded stair is open. Its unsigned margin raises the next question.</p>${button('Visit the unrecorded stair', 'visit', 'west-stair')}`;
}
