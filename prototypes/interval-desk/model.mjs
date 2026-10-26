const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

export const PROBLEM = deepFreeze({
  title: 'The night ledger at Fenmere',
  clock: { start: 0, end: 8, label: 'minutes after 20:00' },
  events: [
    {
      id: 'lantern',
      name: 'Lantern goes dark',
      evidence: [1, 5],
      clockNote: 'Lantern-room witness clock',
    },
    { id: 'bell', name: 'Fog bell sounds', evidence: [3, 7], clockNote: 'Bell keeper clock' },
    { id: 'gate', name: 'West gate opens', evidence: [2, 6], clockNote: 'Gatekeeper clock' },
    { id: 'ledger', name: 'Ledger is signed', evidence: [4, 8], clockNote: 'Office clerk clock' },
    { id: 'case', name: 'Oil case reaches the quay', evidence: [5, 8], clockNote: 'Quay watch' },
  ],
  clues: [
    { before: 'lantern', after: 'bell', text: 'The lantern went dark before the fog bell rang.' },
    { before: 'gate', after: 'ledger', text: 'The west gate opened before the ledger was signed.' },
    {
      before: 'bell',
      after: 'case',
      text: 'The fog bell rang before the oil case reached the quay.',
    },
    {
      before: 'ledger',
      after: 'case',
      text: 'The ledger was signed before the oil case reached the quay.',
    },
  ],
  claims: [
    {
      id: 'lantern-before-case',
      text: 'The lantern went dark before the oil case reached the quay.',
    },
    { id: 'case-before-bell', text: 'The oil case reached the quay before the fog bell rang.' },
    { id: 'gate-before-bell', text: 'The west gate opened before the fog bell rang.' },
  ],
});

const EVENT_BY_ID = new Map(PROBLEM.events.map((event) => [event.id, event]));
const CLAIM_BY_ID = new Map(PROBLEM.claims.map((claim) => [claim.id, claim]));
const ORDERINGS = PROBLEM.clues.map(({ before, after }) => [before, after]);
const CLAIM_PREDICATES = {
  'lantern-before-case': (schedule) => schedule.lantern < schedule.case,
  'case-before-bell': (schedule) => schedule.case < schedule.bell,
  'gate-before-bell': (schedule) => schedule.gate < schedule.bell,
};
const HISTORY_LIMIT = 100;

function copyWindows(windows) {
  return Object.fromEntries(PROBLEM.events.map(({ id }) => [id, [...windows[id]]]));
}

function copyWindowSnapshot(state) {
  return copyWindows(state.windows);
}

export function initialState() {
  return {
    windows: Object.fromEntries(PROBLEM.events.map(({ id, evidence }) => [id, [...evidence]])),
    undoStack: [],
    storyOn: true,
    timelineOn: false,
    claimId: 'gate-before-bell',
  };
}

function sameWindow(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function commitWindows(state, windows) {
  if (PROBLEM.events.every(({ id }) => sameWindow(state.windows[id], windows[id]))) return state;
  return {
    ...state,
    windows,
    undoStack: [...state.undoStack, copyWindowSnapshot(state)].slice(-HISTORY_LIMIT),
  };
}

export function reduce(state, action) {
  if (!state || !action || typeof action.type !== 'string') return state;
  switch (action.type) {
    case 'set-bound': {
      const event = EVENT_BY_ID.get(action.id);
      const current = state.windows?.[action.id];
      const value = Number(action.value);
      if (!event || !Array.isArray(current) || !Number.isSafeInteger(value)) return state;
      const [minimum, maximum] = event.evidence;
      let next;
      if (action.edge === 'earliest')
        next = [Math.max(minimum, Math.min(value, current[1])), current[1]];
      else if (action.edge === 'latest')
        next = [current[0], Math.min(maximum, Math.max(value, current[0]))];
      else return state;
      const windows = copyWindows(state.windows);
      windows[action.id] = next;
      return commitWindows(state, windows);
    }
    case 'nudge': {
      const event = EVENT_BY_ID.get(action.id);
      const current = state.windows?.[action.id];
      if (!event || !Array.isArray(current) || current[0] === current[1]) return state;
      let next;
      if (action.direction === 'earlier') next = [current[0], current[1] - 1];
      else if (action.direction === 'later') next = [current[0] + 1, current[1]];
      else return state;
      const windows = copyWindows(state.windows);
      windows[action.id] = next;
      return commitWindows(state, windows);
    }
    case 'undo': {
      if (!state.undoStack?.length) return state;
      const previous = state.undoStack.at(-1);
      return { ...state, windows: copyWindows(previous), undoStack: state.undoStack.slice(0, -1) };
    }
    case 'restart':
      return initialState();
    case 'story':
      return typeof action.on === 'boolean' ? { ...state, storyOn: action.on } : state;
    case 'timeline':
      return typeof action.on === 'boolean' ? { ...state, timelineOn: action.on } : state;
    case 'claim':
      return CLAIM_BY_ID.has(action.id) ? { ...state, claimId: action.id } : state;
    default:
      return state;
  }
}

// Depth-first enumeration prunes a partial schedule whenever a fully assigned precedence
// constraint is violated. The source intervals keep the complete space at or below 2,500 tuples.
export function enumerate(windows) {
  if (!windows || typeof windows !== 'object') return [];
  for (const { id, evidence } of PROBLEM.events) {
    const interval = windows[id];
    if (
      !Array.isArray(interval) ||
      interval.length !== 2 ||
      !interval.every(Number.isSafeInteger) ||
      interval[0] < evidence[0] ||
      interval[1] > evidence[1] ||
      interval[0] > interval[1]
    )
      return [];
  }

  const schedules = [];
  const current = {};
  function visit(index) {
    if (index === PROBLEM.events.length) {
      schedules.push(Object.fromEntries(PROBLEM.events.map(({ id }) => [id, current[id]])));
      return;
    }
    const { id } = PROBLEM.events[index];
    const [first, last] = windows[id];
    for (let minute = first; minute <= last; minute++) {
      current[id] = minute;
      const violatesAssignedOrdering = ORDERINGS.some(([before, after]) => {
        if (!Object.hasOwn(current, before) || !Object.hasOwn(current, after)) return false;
        return current[before] >= current[after];
      });
      if (!violatesAssignedOrdering) visit(index + 1);
    }
    delete current[id];
  }
  visit(0);
  return schedules;
}

export function classify(schedules, claimId) {
  const predicate = CLAIM_PREDICATES[claimId];
  if (!CLAIM_BY_ID.has(claimId) || typeof predicate !== 'function')
    return { verdict: 'unavailable', supporting: null, counterexample: null };
  if (!Array.isArray(schedules) || schedules.length === 0)
    return { verdict: 'no-schedules', supporting: null, counterexample: null };
  const supporting = schedules.find(predicate) || null;
  const counterexample = schedules.find((schedule) => !predicate(schedule)) || null;
  return {
    verdict: supporting && counterexample ? 'possible' : supporting ? 'necessary' : 'impossible',
    supporting,
    counterexample,
  };
}

export function evaluate(state) {
  const schedules = enumerate(state.windows);
  return {
    schedules,
    ambiguity: schedules.length === 0 ? 'none' : schedules.length === 1 ? 'unique' : 'ambiguous',
    claim: classify(schedules, state.claimId),
  };
}

export function formatMinute(minute) {
  return `20:${String(minute).padStart(2, '0')}`;
}
