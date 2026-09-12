/* Read models only. Canonical puzzles and saves remain owned by the existing app. */
(function (G) {
  'use strict';
  const views = ['desk', 'puzzles', 'house', 'notebook', 'comfort'];
  const families = ['scene', 'dossier', 'witness', 'bridges', 'nonogram', 'lightup', 'tents', 'aquarium', 'network', 'trail', 'sudoku', 'binary', 'futoshiki'];
  const rooms = [
    { id: 'study', title: 'The Study', mark: '01', detail: 'East-facing window. A clock is ticking above the desk.', fact: 'East window · working clock', family: 'scene' },
    { id: 'library', title: 'The Library', mark: '02', detail: 'West-facing window. There is no clock among the shelves.', fact: 'West window · no clock', family: 'nonogram' },
    { id: 'maps', title: 'The Map Room', mark: '03', detail: 'East-facing window. A pale circle marks where the clock used to hang.', fact: 'East window · clock removed', family: 'bridges' },
  ];
  const key = (p) => p.id + '@' + p.revision;
  const completed = (r) => !!(r?.firstCompletedAt || r?.completedAt);
  function locationState(hash) {
    const [path, query = ''] = String(hash || '').split('?');
    const p = new URLSearchParams(query);
    return {
      active: /^#\/?home$/.test(path) && p.get('ux') === 'house',
      view: views.includes(p.get('view')) ? p.get('view') : 'desk',
      q: (p.get('q') || '').slice(0, 120),
      family: families.includes(p.get('family')) ? p.get('family') : '',
      progress: ['new', 'active', 'solved'].includes(p.get('progress')) ? p.get('progress') : '',
      level: ['Gentle', 'Steady', 'Tricky', 'Expert'].includes(p.get('level')) ? p.get('level') : '',
    };
  }
  function url(state = {}) {
    const p = new URLSearchParams({ ux: 'house' });
    if (views.includes(state.view) && state.view !== 'desk') p.set('view', state.view);
    for (const field of ['q', 'family', 'progress', 'level']) {
      if (state[field]) p.set(field, String(state[field]));
    }
    return '#/home?' + p.toString();
  }
  function catalogue(puzzles, records, filters, names = {}) {
    const saved = new Map(records.map((r) => [r.key, r]));
    const query = filters.q.trim().toLocaleLowerCase();
    return puzzles.filter((p) => {
      const r = saved.get(key(p));
      const status = completed(r) ? 'solved' : r?.moves ? 'active' : 'new';
      return (!filters.family || p.type === filters.family) &&
        (!filters.level || p.difficulty === filters.level) &&
        (!filters.progress || filters.progress === status) &&
        (!query || [p.title, p.subtitle, p.type, names[p.type], p.collection].join(' ').toLocaleLowerCase().includes(query));
    });
  }
  function recent(records) {
    return records.filter((r) => r.moves > 0 && !completed(r))
      .slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '') || a.key.localeCompare(b.key));
  }
  function firstPuzzle(puzzles, records) {
    const saved = new Map(records.map((r) => [r.key, r]));
    return puzzles.find((p) => p.id === 'binary-01' && !completed(saved.get(key(p)))) ||
      puzzles.find((p) => p.difficulty === 'Gentle' && !completed(saved.get(key(p)))) || puzzles[0];
  }
  function gameRuns(clubState, E) {
    if (!E) return [];
    const games = {
      tictactoe: ['Tic-Tac-Toe', (r) => E.tictactoe.replay(r.log)],
      blockcabinet: ['Block Cabinet', (r) => E.blockCabinet.replay(r.seed, r.log)],
      regiongardens: ['Lantern Gardens', (r) => E.regionGardens.replay(r.level, r.log)],
      dominoes: ['Draw Dominoes', (r) => E.dominoes.replay(r.seed, r.log)],
      mahjong: ['Mahjong Solitaire', (r) => E.mahjong.replay(r.seed, r.log)],
      borough: ['Pocket Borough', (r) => E.borough.replay(r.seed, r.log)],
      duel: ['Lantern Duel', (r) => r.log.reduce((s, i) => E.reversi.move(s, i), E.reversi.initial())],
      archive: ['Archive Heist', (r) => r.log.reduce((s, i) => E.warehouse.move(s, i), E.warehouse.initial(r.level))],
    };
    return Object.entries(clubState?.runs || {}).flatMap(([id, r]) => {
      if (!r.log?.length || !games[id]) return [];
      try {
        return games[id][1](r).done ? [] : [{ id, title: games[id][0], updatedAt: r.updatedAt || '' }];
      } catch {
        // Invalid/future game records are not repaired or erased by a navigation surface.
        return [];
      }
    });
  }
  function nextActivity(records, games) {
    const puzzle = recent(records)[0];
    const game = games.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (game && (!puzzle || game.updatedAt > puzzle.updatedAt)) return { kind: 'game', ...game };
    return puzzle ? { kind: 'puzzle', record: puzzle } : null;
  }
  function study() {
    return { letter: false, visited: [], answer: '', solved: false, hint: 0 };
  }
  function reduce(state, action) {
    if (action.type === 'letter') return { ...state, letter: true };
    if (action.type === 'inspect' && rooms.some((r) => r.id === action.id)) {
      return { ...state, visited: [...new Set([...state.visited, action.id])] };
    }
    if (action.type === 'hint') return { ...state, hint: Math.min(3, state.hint + 1) };
    if (action.type === 'answer' && rooms.some((r) => r.id === action.id) && state.letter && state.visited.length === rooms.length) {
      return { ...state, answer: action.id, solved: state.solved || action.id === 'maps' };
    }
    return state;
  }
  function nextStep(state) {
    if (state.solved) return 'The desk study is complete. The full castle is ready to explore.';
    if (!state.letter) return 'Read the envelope on your desk.';
    if (state.visited.length < rooms.length) return 'Inspect the three rooms. Their windows and clocks matter.';
    return 'Compare the observations in your notebook.';
  }
  const api = { views, families, rooms, key, completed, locationState, url, catalogue, recent, firstPuzzle, gameRuns, nextActivity, study, reduce, nextStep };
  G.AlibiHouseModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
