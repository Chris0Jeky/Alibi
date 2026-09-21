import * as Cascade from './cascade.mjs';

const DEFAULTS = Object.freeze({ maxNodes: 5000, beamWidth: 64, branchWidth: 24 });
const LIMITS = Object.freeze({ maxNodes: 250000, beamWidth: 512, branchWidth: 512 });

function positiveInteger(name, value, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw Error(`${name} must be a positive safe integer no greater than ${maximum}.`);
  return value;
}

function options(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Calibration options must be an object.');
  const unknown = Object.keys(value).filter((key) => !(key in DEFAULTS));
  if (unknown.length) throw Error(`Unknown calibration option: ${unknown[0]}.`);
  return Object.freeze({
    maxNodes: positiveInteger('maxNodes', value.maxNodes ?? DEFAULTS.maxNodes, LIMITS.maxNodes),
    beamWidth: positiveInteger(
      'beamWidth',
      value.beamWidth ?? DEFAULTS.beamWidth,
      LIMITS.beamWidth,
    ),
    branchWidth: positiveInteger(
      'branchWidth',
      value.branchWidth ?? DEFAULTS.branchWidth,
      LIMITS.branchWidth,
    ),
  });
}

export function stateKey(state) {
  if (!state || state.rules !== Cascade.RULES) throw Error('Expected a Cascade state.');
  return [
    state.rules,
    state.seed,
    state.board.join(''),
    state.tray.map((piece) => (piece === null ? '-' : piece)).join('.'),
    state.round,
    state.turn,
    state.score,
    state.charges,
    state.relics,
    state.goal,
    state.limit,
    Number(state.done),
    Number(state.won),
  ].join('|');
}

function summary(state) {
  return Object.freeze({
    turn: state.turn,
    score: state.score,
    charges: state.charges,
    relics: state.relics,
    goal: state.goal,
    done: state.done,
    won: state.won,
  });
}

function pressure(board) {
  let total = 0;
  for (let n = 0; n < 8; n++) {
    let row = 0;
    let column = 0;
    for (let i = 0; i < 8; i++) {
      row += Number(Boolean(board[n * 8 + i]));
      column += Number(Boolean(board[i * 8 + n]));
    }
    total += row * row + column * column;
  }
  return total;
}

function rank(state) {
  const occupied = state.board.reduce((count, cell) => count + Number(Boolean(cell)), 0);
  return (
    Number(state.won) * 1_000_000_000_000 +
    state.relics * 1_000_000_000 +
    state.score * 100_000 +
    pressure(state.board) * 100 +
    state.charges * 10 -
    state.turn -
    occupied
  );
}

function compareNodes(left, right) {
  return right.rank - left.rank || left.key.localeCompare(right.key, 'en-US-u-kf-upper');
}

function actions(state) {
  const result = [];
  for (let slot = 0; slot < 3; slot++) {
    const piece = state.tray[slot];
    if (piece === null) continue;
    const shapes = new Set();
    for (let rotation = 0; rotation < 4; rotation++) {
      if (rotation && !state.charges) continue;
      const signature = Cascade.shape(piece, rotation).cells
        .map(([x, y]) => `${x},${y}`)
        .join(';');
      if (shapes.has(signature)) continue;
      shapes.add(signature);
      for (const cell of Cascade.placements(state, slot, rotation))
        result.push(Object.freeze({ slot, cell, rotation }));
    }
  }
  return result;
}

function reference(seed, log) {
  return Object.freeze({
    rules: Cascade.RULES,
    seed,
    log: Object.freeze(log.map((action) => Object.freeze({ ...action }))),
    redo: Object.freeze([]),
  });
}

export function verifyReference(value) {
  let state;
  try {
    if (!value || !Array.isArray(value.redo) || value.redo.length)
      throw Error('Reference replays cannot contain redo moves.');
    state = Cascade.replay(value);
  } catch (error) {
    throw Error('Expected a winning Cascade replay.', { cause: error });
  }
  if (!state.won || !state.done) throw Error('Expected a winning Cascade replay.');
  return summary(state);
}

function result(seed, status, nodes, generated, best, solved = null) {
  return Object.freeze({
    seed,
    rules: Cascade.RULES,
    status,
    proven: Boolean(solved),
    nodes,
    generated,
    depth: solved?.log.length ?? best.log.length,
    reference: solved,
    final: solved ? verifyReference(solved) : null,
    best: summary(best.state),
  });
}

export function searchSeed(seed, value = {}) {
  const normalizedSeed = Cascade.seedText(seed);
  const limits = options(value);
  const start = Cascade.initial(normalizedSeed);
  const root = {
    state: start,
    log: [],
    key: stateKey(start),
    rank: rank(start),
  };
  const frontier = [root];
  const seen = new Set([root.key]);
  let best = root;
  let nodes = 0;
  let generated = 0;

  while (frontier.length && nodes < limits.maxNodes) {
    frontier.sort(compareNodes);
    const current = frontier.shift();
    nodes++;
    if (compareNodes(current, best) < 0) best = current;
    const children = [];
    for (const action of actions(current.state)) {
      generated++;
      const state = Cascade.move(current.state, action.slot, action.cell, action.rotation);
      const log = [...current.log, action];
      const solved = state.won ? reference(normalizedSeed, log) : null;
      if (solved) return result(normalizedSeed, 'solved', nodes, generated, { state, log }, solved);
      if (state.done) continue;
      const key = stateKey(state);
      if (seen.has(key)) continue;
      children.push({ state, log, key, rank: rank(state) });
    }
    children.sort(compareNodes);
    for (const child of children.slice(0, limits.branchWidth)) {
      seen.add(child.key);
      frontier.push(child);
      if (compareNodes(child, best) < 0) best = child;
    }
    frontier.sort(compareNodes);
    if (frontier.length > limits.beamWidth) frontier.length = limits.beamWidth;
  }

  return result(
    normalizedSeed,
    frontier.length ? 'budget-exhausted' : 'frontier-exhausted',
    nodes,
    generated,
    best,
  );
}

export function calibrateSeeds(seeds, value = {}) {
  if (!Array.isArray(seeds) || !seeds.length || seeds.length > 256)
    throw Error('Provide between 1 and 256 Cascade seeds.');
  const normalized = seeds.map(Cascade.seedText);
  if (new Set(normalized).size !== normalized.length)
    throw Error('Calibration seeds must not contain duplicates.');
  const normalizedOptions = options(value);
  const results = normalized.map((seed) => searchSeed(seed, normalizedOptions));
  const solved = results.filter((entry) => entry.status === 'solved').length;
  return Object.freeze({
    rules: Cascade.RULES,
    options: normalizedOptions,
    results: Object.freeze(results),
    summary: Object.freeze({ total: results.length, solved, unresolved: results.length - solved }),
    claimsHumanDifficulty: false,
  });
}
