// Keep repeated field names out of the Castle bundle.
const puzzle = (title, label, setup, rules, hints, solution, after) => ({
  title,
  label,
  setup,
  rules,
  hints,
  solution,
  after,
});
export default {
  gate: /* @__PURE__ */ puzzle(
    'The three brass wheels',
    'Constraint puzzle',
    [0, 0, 0],
    [
      'Each wheel can show a whole number from 0 to 6.',
      'The numbers increase from left to right. Their total is 9.',
      'The right wheel is exactly 4 more than the left wheel.',
    ],
    [
      'Use the difference to express the right wheel in terms of the left.',
      'Once the outer pair is fixed, the total fixes the middle. Check the increasing order.',
    ],
    [1, 3, 5],
    'The bolt draws back. A library card has been caught beneath it for years. The Map Room, beyond the Long Library, is now open.',
  ),
  shelves: /* @__PURE__ */ puzzle(
    'The misplaced maintenance slip',
    'Ordering puzzle',
    ['moss', 'letters', 'tides', 'atlas', 'stars'],
    [
      'Arrange the five books from left to right. Select two books to swap them.',
      'The Atlas is first. Letters is last.',
      'Tides is immediately after the Atlas. Stars comes before Moss.',
    ],
    [
      'Place the two fixed ends first.',
      'Tides has only one possible place. Compare the two spaces left.',
    ],
    ['atlas', 'tides', 'stars', 'moss', 'letters'],
    'Inside Stars is Finch’s maintenance slip: the station clock was seventeen minutes fast. The observatory instrument was calibrated. The Observatory is now open.',
  ),
  clock: /* @__PURE__ */ puzzle(
    'The seventeenth minute',
    'Time calibration',
    '21:17',
    [
      'Finch’s station ticket is stamped 21:17.',
      'The maintenance slip says this clock was exactly 17 minutes fast.',
      'Enter the actual station departure time in 24-hour form, such as 21:17 or 2117.',
    ],
    [
      'A fast clock displays a later time than the actual time.',
      'Subtract the error. This is the departure time, not an arrival time.',
    ],
    '21:00',
    '21:00. The ticket predates the 21:10 tower bell. The claim of lateness now depends on the route, not merely the printed time.',
  ),
  route: /* @__PURE__ */ puzzle(
    'The green footpath',
    'Route planning',
    ['S'],
    [
      'Finch left the station S at 21:00. The calibrated tower bell rang at 21:10.',
      'Tap connected places to trace a route to tower T. Lines are labelled with stipulated travel minutes. Do not revisit a place.',
      'Find a route that arrives strictly before the bell. This proves a route was possible, not that Finch took it.',
    ],
    [
      'Compare total travel time, not the number of stops.',
      'Ten minutes is too late for “before”. Follow the path through the orchard.',
    ],
    ['S', 'B', 'O', 'T'],
    'Seven minutes: arrival at 21:07 was possible. You will need another record to establish whether Finch took this path.',
  ),
  lamps: /* @__PURE__ */ puzzle(
    'The orangery lantern lattice',
    'A reversible light puzzle',
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [
      'Light all nine lanterns. Tap one to toggle it and its orthogonal neighbours.',
      'The dots and text identify lit and unlit lanterns, as well as colour.',
      'Moves are reversible. There is no timer or penalty for trying.',
    ],
    [
      'Each press affects a fixed cross. Record which lanterns change.',
      'Pressing any lantern twice cancels out. Think about which presses need to happen an odd number of times.',
    ],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    'All nine lanterns are lit. The keeper can finally read the labels along the back shelf. No garden items have been changed.',
  ),
  hanoi: /* @__PURE__ */ puzzle(
    'Three small problems',
    'A recursive thinking table',
    [],
    [
      'Move the stack from peg A to peg C.',
      'Select a source peg, then a destination. Only the top disk moves.',
      'Never place a larger disk on a smaller one. Any legal solution counts; seven moves is the minimum.',
    ],
    [
      'Before the largest disk can move to C, the smaller two must be somewhere else.',
      'Solve that smaller problem, move the largest disk, then solve the smaller problem again.',
    ],
    [
      [0, 2],
      [0, 1],
      [2, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [0, 2],
    ],
    'The stack reaches the third peg. Try describing how you moved the two smaller disks; that part of the method will work again with a taller stack.',
  ),
  bridges: /* @__PURE__ */ puzzle(
    'The walk that cannot be taken',
    'An impossibility investigation',
    { odd: [], conclusion: '' },
    [
      'The schematic has four land areas and seven bridges. Parallel curves are separate bridges.',
      'Explore by selecting a starting area, then connected unused bridges. A complete walk would use every bridge once.',
      'Mark every area with an odd number of incident bridges. Then decide whether a complete walk is possible.',
    ],
    [
      'Count connections at each land area, including both parallel bridges.',
      'An internal visit uses an arrival and a departure. Only the start and end can have an unpaired crossing.',
    ],
    { odd: ['N', 'S', 'I', 'E'], conclusion: 'impossible' },
    'All four areas have odd degree (3, 3, 5, 3). A connected undirected graph has a walk using every edge once only with zero or two odd-degree vertices. Four is impossible. That is a complete solution.',
  ),
  magic: /* @__PURE__ */ puzzle(
    'Nine numbers, one balance',
    'Lo Shu exploration',
    [5, 4, 6, 3, 2, 7, 9, 1, 8],
    [
      'Select any two tiles to swap. Use every number from 1 to 9 once.',
      'Every row, every column and both main diagonals must total 15.',
      'All rotations and reflections count. There is no required orientation.',
    ],
    [
      'The total of all nine numbers is 45, so each of the three rows must total 15.',
      'In a normal 3 × 3 magic square, the centre is 5 and opposite pairs total 10.',
    ],
    [4, 9, 2, 3, 5, 7, 8, 1, 6],
    'Every line totals fifteen. Turn the square a quarter turn and check again: the same relationships remain.',
  ),
  ur: /* @__PURE__ */ puzzle(
    'What would fair dice do?',
    'A modern probability model',
    null,
    [
      'This is an explicit modern model, not an ancient rules reconstruction.',
      'Assume four independent fair binary dice. Each shows either a marked or an unmarked tip.',
      'Explore the sixteen equally likely patterns. Which total number of marked tips has the most patterns?',
    ],
    [
      'A total of zero has only one pattern: no marked tips.',
      'Count different positions of the marked tips rather than only different totals.',
    ],
    2,
    'Two marked tips has six patterns out of sixteen. The totals have counts 1, 4, 6, 4, 1. This calculation follows from the model’s assumptions; the surviving objects do not prove those assumptions.',
  ),
  inference: /* @__PURE__ */ puzzle(
    'What does the evidence actually say?',
    'Chapter I · synthesis',
    '',
    [
      'Compare the maintenance slip, the corrected ticket and the surveyed route.',
      'The official account says the ticket proves Finch was too late to reach the tower before 21:10.',
      'Choose only the conclusion supported by those records. No witness here establishes the route he actually took.',
    ],
    [
      'The timing permits a seven-minute journey before the bell.',
      'Do not turn “he could have been there” into “he was there”. Reject only what the evidence rules out.',
    ],
    'possible-not-proven',
    'The ticket cannot establish that Finch was late. His whereabouts still need checking. Behind the cupboard, a latch comes loose: the Unrecorded Stair is open.',
  ),
};
