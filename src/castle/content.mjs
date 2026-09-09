import rooms from './rooms.mjs';
import puzzles from './puzzles.mjs';
export default {
  rooms,
  puzzles,
  version: 1,
  title: 'Wrenmere Castle',
  subtitle: 'The Seventeenth Minute',
  evidence: [
    {
      id: 'maintenance',
      title: 'The maintenance slip',
      from: 'The Long Library',
      requires: 'shelves',
      text: 'Station clock: seventeen minutes fast. Observatory clock: checked against the noon signal. Adjustment deferred. Signed R. Finch.',
      kind: 'Record',
      question: 'What does a timestamp measure when the instrument is wrong?',
    },
    {
      id: 'ticket',
      title: 'The corrected ticket',
      from: 'The Observatory',
      requires: 'clock',
      text: 'The station ticket is stamped 21:17. Subtracting the documented 17-minute error gives 21:00. This dates Finch’s departure from the station, not his arrival at the tower.',
      kind: 'Derived fact',
      question: 'What does this establish, and what does it leave open?',
    },
    {
      id: 'path',
      title: 'The green footpath',
      from: 'The Map Room',
      requires: 'route',
      text: 'The surveyed footpath takes 7 minutes: station to bridge, 2; bridge to orchard, 3; orchard to tower, 2. These are the case’s stipulated travel times. The tower bell rang at 21:10 by its calibrated clock.',
      kind: 'Route model',
      question: 'Is a feasible route evidence that someone actually took it?',
    },
    {
      id: 'margin',
      title: 'The margin under the stairs',
      from: 'The Unrecorded Stair',
      requires: 'inference',
      text: '“I saw Mara take the courtyard stair towards the river.” The note is unsigned. It does not establish why she went or whether the writer saw her arrive.',
      kind: 'Unverified testimony',
      question: 'Who wrote this, and which part did they see?',
    },
  ],
  exhibits: [
    {
      id: 'bridges',
      title: 'A walk that cannot be taken',
      era: 'Königsberg · 1736',
      region: 'Prussia, now Kaliningrad, Russia',
      method: 'Find an invariant',
      source: ['bridges'],
      summary:
        'Try tracing the bridges, then count the connections at each bank. The count explains why the walk keeps getting stuck.',
      history:
        'Euler’s 1736 work showed that a route crossing each of the seven bridges exactly once is impossible. Our schematic preserves the connections, not the physical scale of the city.',
      boundary:
        'Documented mathematical history. The interactive diagram and wording are original adaptations.',
      puzzle: 'bridges',
    },
    {
      id: 'magic',
      title: 'Nine numbers, one balance',
      era: 'Lo Shu tradition · date uncertain',
      region: 'China',
      method: 'Use symmetry and a conserved sum',
      source: ['magic'],
      summary:
        'Swap the nine numbers until every row, column and both main diagonals total 15. The number in the centre helps the rest fall into place.',
      history:
        'The Lo Shu is associated with Chinese traditions about a patterned turtle. That is a legend, not a securely dated account of an invention. Gresham’s lecture discusses the diagram and later mathematical developments.',
      boundary:
        'The tradition is historical; the turtle story is labelled legend. Rotations and reflections are equally valid mathematical solutions.',
      puzzle: 'magic',
    },
    {
      id: 'ur',
      title: 'An object outlives its instructions',
      era: 'Ur · c. 2600–2400 BCE',
      region: 'Mesopotamia, present-day Iraq',
      method: 'Separate evidence from reconstruction',
      source: ['ur', 'dice'],
      summary:
        'Examine the recorded objects, then try a stated model of four fair binary dice. Keep its assumptions beside the result.',
      history:
        'The British Museum dates board 120834 to 2600–2400 BCE. A tetrahedral die from Ur has marks on two corners. Here we explicitly assume four independent, fair binary outcomes to explore their sums.',
      boundary:
        'Documented objects; explicitly modern fair-dice model. This is not a playable reconstruction of the complete Royal Game of Ur.',
      puzzle: 'ur',
    },
  ],
  sources: {
    bridges: {
      title: 'Euler and the bridge problem',
      publisher: 'MacTutor, University of St Andrews',
      url: 'https://mathshistory.st-andrews.ac.uk/HistTopics/Topology_in_mathematics/',
      checked: '2026-09-09',
    },
    ur: {
      title: 'Royal Game of Ur, object 120834',
      publisher: 'British Museum',
      url: 'https://www.britishmuseum.org/collection/object/W_1928-1009-378',
      checked: '2026-09-09',
    },
    dice: {
      title: 'Tetrahedral die, object 120840',
      publisher: 'British Museum',
      url: 'https://www.britishmuseum.org/collection/object/W_1928-1009-385',
      checked: '2026-09-09',
    },
    magic: {
      title: 'The Mathematics that Counts',
      publisher: 'Gresham College, Professor Robin Wilson',
      url: 'https://www.gresham.ac.uk/watch-now/mathematics-counts',
      checked: '2026-09-09',
    },
  },
  originalStory: true,
  introduction:
    'The keeper meets you at the gate with a key and a stack of unsorted papers. Wrenmere opens again in a fortnight. Start with the library, they suggest. Then they mention the ticket in the study.',
  contentNote:
    'The wider story concerns bereavement, a flood and a wrongful accusation. There are no jump scares or graphic scenes. You may explore the museum and puzzles without following the story.',
  chapter: {
    id: 'seventeenth-minute',
    title: 'The Seventeenth Minute',
    premise:
      'In 1911, a flood took the life of the castle’s curator, Mara Vale. A clockmaker was blamed for returning too late to help. The ticket used against him is still in the house.',
    ending:
      'Finch could have reached the tower before the bell. The ticket cannot settle whether he did. The cupboard catch gives way, exposing a stair left off the later plan.',
  },
  credits:
    'Original fictional estate and illustrations adapted from the supplied Wrenmere package. Historical sources appear on each exhibit.',
};
