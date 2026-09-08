/* Trusted challenge registry. Challenge data is release-owned, never a player pack. */
(function (G) {
  'use strict';
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const stable = (x) => {
    if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
    if (x && typeof x === 'object')
      return (
        '{' +
        Object.keys(x)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + stable(x[k]))
          .join(',') +
        '}'
      );
    return JSON.stringify(x);
  };
  const hash = (x) => {
    let h = 2166136261;
    for (const c of stable(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const fail = (text) => {
    throw Error(text);
  };
  const actionShape = (value) => value && typeof value === 'object' && !Array.isArray(value);

  function create(raw, adapters = {}) {
    const Q = adapters.quiet || G.QWEngine;
    const E = adapters.club || G.AlibiClubEngines;
    if (
      !Q?.classicInitial ||
      !Q?.classicMove ||
      !Q?.classicWon ||
      !E?.warehouse ||
      !E?.reversi ||
      !E?.borough
    )
      fail('Challenge engines are unavailable.');
    const entries = Array.isArray(raw) ? raw : raw?.challenges;
    if (!Array.isArray(entries) || entries.length !== 59) fail('Expected 59 trusted challenges.');
    const byId = new Map();
    for (const source of entries) {
      if (!source || !/^curated-(classic|archive|duel|borough)-[a-z0-9-]+$/.test(source.id || ''))
        fail('Invalid trusted challenge ID.');
      if (source.revision !== 1 || byId.has(source.id)) fail('Invalid trusted challenge revision.');
      const challenge = copy(source);
      challenge.mechanismId = source.family;
      validateDefinition(challenge, Q, E);
      challenge.startingStateHash = hash(startDescriptor(challenge));
      byId.set(challenge.id, Object.freeze(challenge));
    }

    function get(id) {
      const value = byId.get(id);
      if (!value) fail('Unknown trusted challenge.');
      return value;
    }
    function begin(id) {
      const c = get(id);
      return {
        format: 'alibi-challenge-run',
        schema: 1,
        challengeId: c.id,
        challengeRevision: c.revision,
        mechanismId: c.mechanismId,
        startingStateHash: c.startingStateHash,
        objective: objective(c),
        log: [],
      };
    }
    function replay(value) {
      const run = validateRun(value);
      const c = get(run.challengeId);
      let state = start(c, Q, E);
      for (const action of run.log) state = apply(c, state, action, Q, E);
      return { challenge: c, run, state, complete: complete(c, state, E) };
    }
    function validateRun(value) {
      if (
        !value ||
        value.format !== 'alibi-challenge-run' ||
        value.schema !== 1 ||
        typeof value.challengeId !== 'string' ||
        !Number.isInteger(value.challengeRevision) ||
        typeof value.mechanismId !== 'string' ||
        typeof value.startingStateHash !== 'string' ||
        !Array.isArray(value.log) ||
        value.log.length > 5000
      )
        fail('Unsupported challenge save.');
      const c = get(value.challengeId);
      if (
        value.challengeRevision !== c.revision ||
        value.mechanismId !== c.mechanismId ||
        value.startingStateHash !== c.startingStateHash ||
        !equal(value.objective, objective(c))
      )
        fail('Challenge save does not match its trusted definition.');
      let state = start(c, Q, E);
      for (const action of value.log) state = apply(c, state, action, Q, E);
      return copy(value);
    }
    return Object.freeze({
      version: 1,
      count: byId.size,
      get,
      begin,
      replay,
      validateRun,
      entries: () => [...byId.values()],
    });
  }

  function validateDefinition(c, Q, E) {
    if (
      ![
        'hanoi',
        'sliding',
        'river',
        'jugs',
        'queens',
        'magic',
        'knight',
        'warehouse',
        'reversi',
        'borough',
      ].includes(c.family)
    )
      fail('Unsupported challenge mechanism.');
    let state = start(c, Q, E);
    const supplied = c.solutionActions || c.solutionPath || c.principalVariation;
    const solution = typeof supplied === 'string' ? [...supplied] : supplied;
    if (!Array.isArray(solution) || !solution.length) fail('Trusted challenge lacks a replay.');
    for (const action of solution) state = apply(c, state, action, Q, E);
    if (!complete(c, state, E)) fail('Trusted challenge replay does not meet its objective.');
  }
  function startDescriptor(c) {
    if (c.family === 'warehouse') return { map: c.map };
    if (c.family === 'borough') return { seed: c.seed, targetScore: c.targetScore };
    return {
      startState: c.startState,
      fixedCells: c.fixedCells || [],
      fixedPrefixLength: c.fixedPrefixLength || 0,
    };
  }
  function start(c, Q, E) {
    if (c.family === 'warehouse') return E.warehouse.fromMap(c.map);
    if (c.family === 'borough') return E.borough.initial(E.seedText(c.seed));
    if (c.family === 'reversi') {
      let state = E.reversi.initial();
      for (const action of c.startActions || []) {
        if (!E.reversi.legal(state).includes(action)) fail('Invalid Reversi starting replay.');
        state = E.reversi.move(state, action);
      }
      if (!equal(state, c.startState)) fail('Reversi start is not reproducible.');
      return state;
    }
    const supplied = c.startState;
    if (
      !supplied ||
      typeof supplied.id !== 'string' ||
      !Number.isInteger(supplied.moves) ||
      supplied.moves !== 0
    )
      fail('Invalid classic challenge start.');
    if (Array.isArray(c.startActions)) {
      let state = Q.classicInitial(supplied.id);
      for (const action of c.startActions) {
        const next = Q.classicMove(state, action);
        if (next.error) fail('Invalid classic starting replay.');
        state = next.state;
      }
      state.moves = 0;
      if (!equal(state, supplied)) fail('Classic start is not reproducible.');
    } else if (c.family === 'sliding') {
      const tiles = supplied.tiles;
      if (
        !Array.isArray(tiles) ||
        tiles.length !== 9 ||
        new Set(tiles).size !== 9 ||
        !tiles.every((v) => Number.isInteger(v) && v >= 0 && v <= 8)
      )
        fail('Invalid sliding challenge start.');
      const inversions = tiles
        .filter(Boolean)
        .flatMap((v, i) => tiles.slice(i + 1).filter((x) => x && x < v)).length;
      if (inversions % 2) fail('Unreachable sliding challenge start.');
    } else fail('Classic challenge start requires replay evidence.');
    if (
      c.family === 'queens' &&
      (!Array.isArray(c.fixedCells) ||
        c.fixedCells.length !== 3 ||
        !equal(c.fixedCells, supplied.q) ||
        new Set(c.fixedCells).size !== 3)
    )
      fail('Queens givens are invalid.');
    if (
      c.family === 'knight' &&
      (!Number.isInteger(c.fixedPrefixLength) ||
        c.fixedPrefixLength < 1 ||
        c.fixedPrefixLength !== supplied.path.length)
    )
      fail('Knight prefix is invalid.');
    return copy(supplied);
  }
  function validAction(c, action) {
    if (c.family === 'warehouse')
      return (
        typeof action === 'string' &&
        ['up', 'right', 'down', 'left', 'U', 'R', 'D', 'L'].includes(action)
      );
    if (c.family === 'reversi') return Number.isInteger(action) && action >= 0 && action < 36;
    if (c.family === 'borough')
      return actionShape(action) && Number.isInteger(action.slot) && Number.isInteger(action.cell);
    return actionShape(action);
  }
  function apply(c, state, action, Q, E) {
    if (!validAction(c, action)) fail('Invalid challenge replay action.');
    if (c.family === 'warehouse') {
      const direction = { U: 'up', R: 'right', D: 'down', L: 'left' }[action] || action;
      const next = E.warehouse.move(state, direction);
      if (next === state) fail('Illegal archive replay action.');
      return next;
    }
    if (c.family === 'reversi') {
      if (!E.reversi.legal(state).includes(action)) fail('Illegal Duel replay action.');
      return E.reversi.move(state, action);
    }
    if (c.family === 'borough') return E.borough.move(state, action.slot, action.cell);
    if (c.family === 'queens' && c.fixedCells.includes(action.cell))
      fail('A given queen is fixed.');
    if (c.family === 'knight' && c.startState.path.includes(action.cell))
      fail('The fixed knight prefix cannot be undone.');
    const next = Q.classicMove(state, action);
    if (next.error) fail(next.error);
    if (c.family === 'queens' && !c.fixedCells.every((cell) => next.state.q.includes(cell)))
      fail('A given queen is fixed.');
    if (
      c.family === 'knight' &&
      !equal(next.state.path.slice(0, c.fixedPrefixLength), c.startState.path)
    )
      fail('The fixed knight prefix cannot be undone.');
    return next.state;
  }
  function objective(c) {
    if (c.family === 'borough') return { type: 'score', targetScore: c.targetScore, seed: c.seed };
    if (c.family === 'reversi') return { type: 'terminal-win', player: c.startState.turn };
    return { type: 'complete' };
  }
  function complete(c, state, E) {
    if (c.family === 'borough') return state.done && E.borough.score(state) >= c.targetScore;
    if (c.family === 'reversi') {
      const score = E.reversi.score(state);
      return state.done && (score.gold - score.ink) * c.startState.turn > 0;
    }
    return c.family === 'warehouse'
      ? state.done
      : G.QWEngine
        ? G.QWEngine.classicWon(state)
        : false;
  }
  G.AlibiChallenges = { create };
  if (typeof module !== 'undefined') module.exports = G.AlibiChallenges;
})(globalThis);
