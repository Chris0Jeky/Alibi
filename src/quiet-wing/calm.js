/* Small deterministic games. No timers, networking, random rewards or stored solutions. */
(function (G) {
  'use strict';
  const definitions = {
    'tideglass-morning': {
      family: 'pour',
      capacity: 4,
      jars: [[0, 1, 2, 0], [1, 2, 0, 1], [2, 0, 1, 2], [], []],
    },
    'tideglass-dusk': {
      family: 'pour',
      capacity: 3,
      jars: [[0, 1, 2], [1, 2, 3], [2, 3, 0], [3, 0, 1], [], []],
    },
    'pairs-meadow': { family: 'pairs', seed: 7151 },
    'pairs-shore': { family: 'pairs', seed: 9167 },
  };
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function initial(id) {
    const definition = Object.hasOwn(definitions, id) ? definitions[id] : null;
    if (!definition) throw Error('Unknown quiet game.');
    if (definition.family === 'pour')
      return {
        id,
        family: 'pour',
        capacity: definition.capacity,
        jars: copy(definition.jars),
        moves: 0,
      };
    const cards = Array.from({ length: 16 }, (_, i) => i % 8);
    let seed = definition.seed;
    for (let i = cards.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return { id, family: 'pairs', cards, open: [], matched: [], moves: 0 };
  }
  function won(state) {
    if (state.family === 'pairs') return state.matched.length === state.cards.length;
    return state.jars.every(
      (jar) => !jar.length || (jar.length === state.capacity && jar.every((v) => v === jar[0])),
    );
  }
  function move(state, action) {
    if (!action || typeof action !== 'object') return { error: 'Choose a piece first.' };
    if (won(state))
      return { error: 'This arrangement is complete. Undo or start again to keep exploring.' };
    const next = copy(state);
    if (state.family === 'pour') {
      const { from, to } = action;
      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 0 ||
        to < 0 ||
        from >= state.jars.length ||
        to >= state.jars.length ||
        from === to
      )
        return { error: 'Choose two different glasses.' };
      const source = next.jars[from],
        target = next.jars[to],
        colour = source.at(-1);
      if (!source.length) return { error: 'That glass is empty. Choose one with colour in it.' };
      if (target.length === state.capacity) return { error: 'That glass is full.' };
      if (target.length && target.at(-1) !== colour)
        return { error: 'Pour onto the same symbol and colour, or into an empty glass.' };
      while (source.length && source.at(-1) === colour && target.length < state.capacity)
        target.push(source.pop());
    } else {
      const cell = action.cell;
      if (!Number.isInteger(cell) || cell < 0 || cell >= state.cards.length)
        return { error: 'Choose a card.' };
      if (next.matched.includes(cell)) return { error: 'That pair is already together.' };
      if (next.open.length === 2) next.open = [];
      if (next.open.includes(cell)) return { error: 'Choose a second card.' };
      next.open.push(cell);
      if (next.open.length === 2 && next.cards[next.open[0]] === next.cards[next.open[1]]) {
        next.matched.push(...next.open);
        next.matched.sort((a, b) => a - b);
        next.open = [];
      }
    }
    next.moves++;
    return { state: next, won: won(next) };
  }
  // Breadth-first search with a firm state budget. Hints inspect the current board.
  function solve(state, limit = 12000) {
    if (state.family !== 'pour') return { error: 'Pair cards have no hidden-answer hint.' };
    const key = (s) => JSON.stringify(s.jars),
      start = key(state);
    const queue = [state],
      visited = new Map([[start, null]]);
    for (let q = 0; q < queue.length; q++) {
      const current = queue[q],
        currentKey = key(current);
      if (won(current)) {
        const actions = [];
        let k = currentKey;
        while (visited.get(k)) {
          const step = visited.get(k);
          actions.push(step.action);
          k = step.parent;
        }
        return { actions: actions.reverse(), visited: visited.size };
      }
      for (let from = 0; from < current.jars.length; from++) {
        if (!current.jars[from].length) continue;
        // Moving a complete uniform glass only renames an identical state.
        if (
          current.jars[from].length === current.capacity &&
          current.jars[from].every((v) => v === current.jars[from][0])
        )
          continue;
        let emptySeen = false;
        for (let to = 0; to < current.jars.length; to++) {
          if (!current.jars[to].length) {
            if (emptySeen) continue;
            emptySeen = true;
          }
          const action = { from, to },
            result = move(current, action);
          if (result.error) continue;
          const k = key(result.state);
          if (visited.has(k)) continue;
          if (visited.size >= limit) return { limited: true, visited: visited.size };
          visited.set(k, { parent: currentKey, action });
          queue.push(result.state);
        }
      }
    }
    return { actions: null, visited: visited.size };
  }
  G.QWCalm = { definitions, initial, move, won, solve };
  if (typeof module !== 'undefined') module.exports = G.QWCalm;
})(typeof window === 'undefined' ? globalThis : window);
