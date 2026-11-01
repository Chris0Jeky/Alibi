export const LAMPS = Object.freeze(['east', 'west', 'stair']);
export const WORLDS = Object.freeze(
  Array.from({ length: 8 }, (_, bits) =>
    Object.freeze(Object.fromEntries(LAMPS.map((lamp, i) => [lamp, Boolean(bits & (1 << i))]))),
  ),
);

export const REPORTS = Object.freeze(
  [
    { id: 'r1', source: 'East watch', text: 'The East lantern was lit.', allows: (w) => w.east },
    { id: 'r2', source: 'West watch', text: 'The West lantern was lit.', allows: (w) => w.west },
    {
      id: 'r3',
      source: 'First circuit record',
      text: 'The East and West lanterns were not both lit. Either one, or neither, could be lit.',
      allows: (w) => !(w.east && w.west),
    },
    { id: 'r4', source: 'Stair watch', text: 'The Stair lantern was lit.', allows: (w) => w.stair },
    {
      id: 'r5',
      source: 'Second circuit record',
      text: 'The East and Stair lanterns were not both lit. Either one, or neither, could be lit.',
      allows: (w) => !(w.east && w.stair),
    },
  ].map(Object.freeze),
);
export const RETAINED = Object.freeze(REPORTS.filter((r) => ['r2', 'r3', 'r5'].includes(r.id)));

// Trusted authored predicates only; this experiment has eight worlds and at most six reports.
export function admissible(reports) {
  if (!Array.isArray(reports) || reports.length > 6)
    throw new Error('Expected at most six reports.');
  return WORLDS.filter((world) => reports.every((report) => report.allows(world)));
}

export function judgeConflict(ids, reports = REPORTS) {
  if (
    !Array.isArray(ids) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !reports.some((r) => r.id === id))
  )
    return { status: 'invalid' };
  if (!ids.length) return { status: 'empty' };
  const worlds = admissible(reports.filter((r) => ids.includes(r.id)));
  if (worlds.length) return { status: 'consistent', world: worlds[0] };
  const minimum = smallestConflicts(reports)[0].length;
  return { status: ids.length === minimum ? 'smallest' : 'too-large', minimum };
}

export function smallestConflicts(reports = REPORTS) {
  admissible(reports); // Check the finite bound before enumerating subsets.
  let size = Infinity;
  let found = [];
  for (let mask = 1; mask < 2 ** reports.length; mask++) {
    const selected = reports.filter((_, i) => mask & (1 << i));
    if (selected.length > size || admissible(selected).length) continue;
    if (selected.length < size) {
      size = selected.length;
      found = [];
    }
    found.push(selected.map((r) => r.id));
  }
  return found;
}

export function judgeCounterexample(world, premises = RETAINED, claim = (w) => w.stair) {
  if (!admissible(premises).length) return { status: 'no-worlds' };
  if (
    !world ||
    Object.keys(world).length !== LAMPS.length ||
    LAMPS.some((lamp) => typeof world[lamp] !== 'boolean')
  )
    return { status: 'incomplete' };
  if (!premises.every((r) => r.allows(world))) return { status: 'violates-premises' };
  return { status: claim(world) ? 'supports-claim' : 'counterexample' };
}

export function initialState() {
  return {
    selected: [],
    world: { east: null, west: null, stair: null },
    story: true,
    conflict: null,
    counterexample: null,
    hint: null,
    reveal: false,
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case 'select':
      if (!REPORTS.some((r) => r.id === action.id)) return state;
      return {
        ...state,
        conflict: null,
        selected: state.selected.includes(action.id)
          ? state.selected.filter((id) => id !== action.id)
          : [...state.selected, action.id],
      };
    case 'lamp':
      if (!LAMPS.includes(action.id) || ![true, false, null].includes(action.value)) return state;
      return {
        ...state,
        counterexample: null,
        world: { ...state.world, [action.id]: action.value },
      };
    case 'check-conflict':
      return { ...state, conflict: judgeConflict(state.selected) };
    case 'check-counterexample':
      return { ...state, counterexample: judgeCounterexample(state.world) };
    case 'story':
      return { ...state, story: !state.story };
    case 'hint':
      return ['conflict', 'counterexample'].includes(action.for)
        ? { ...state, hint: action.for }
        : state;
    case 'reveal':
      return { ...state, reveal: !state.reveal };
    case 'restart':
      return initialState();
    default:
      return state;
  }
}
