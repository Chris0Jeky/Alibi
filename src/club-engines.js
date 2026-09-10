/* Club experiments. Pure deterministic rules; shared by UI, bot and optional room server. */
(function (root) {
  'use strict';
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const integer = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  function hash(text) {
    let h = 2166136261;
    for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function random(seed) {
    let a = hash(seed);
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedText(value) {
    const s = String(value || 'ALIBI');
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(s))
      throw Error('Use 1–32 letters, numbers, underscores or hyphens.');
    return s.toUpperCase();
  }
  const dirs = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  const reversi = {
    initial() {
      const b = Array(36).fill(0);
      b[14] = b[21] = -1;
      b[15] = b[20] = 1;
      return { board: b, turn: 1, ply: 0, passed: 0, done: false };
    },
    flips(s, i, player = s.turn) {
      if (!integer(i, 0, 35) || s.board[i] !== 0) return [];
      const out = [];
      for (const [dy, dx] of dirs) {
        let y = Math.floor(i / 6) + dy,
          x = (i % 6) + dx,
          line = [];
        while (y >= 0 && y < 6 && x >= 0 && x < 6 && s.board[y * 6 + x] === -player) {
          line.push(y * 6 + x);
          y += dy;
          x += dx;
        }
        if (line.length && y >= 0 && y < 6 && x >= 0 && x < 6 && s.board[y * 6 + x] === player)
          out.push(...line);
      }
      return out;
    },
    legal(s, player = s.turn) {
      if (s.done) return [];
      return s.board.flatMap((v, i) => (!v && this.flips(s, i, player).length ? [i] : []));
    },
    move(s, i) {
      if (s.done) throw Error('This match is finished.');
      const f = this.flips(s, i);
      if (!f.length) throw Error('A move must enclose at least one opposing lantern.');
      const q = copy(s);
      q.board[i] = q.turn;
      f.forEach((j) => (q.board[j] = q.turn));
      q.ply++;
      q.turn = -q.turn;
      q.passed = 0;
      if (!this.legal(q).length) {
        q.passed = q.turn;
        q.turn = -q.turn;
        if (!this.legal(q).length) {
          q.done = true;
          q.turn = 0;
        }
      }
      return q;
    },
    score(s) {
      return {
        gold: s.board.filter((v) => v === 1).length,
        ink: s.board.filter((v) => v === -1).length,
      };
    },
    evaluate(s, player) {
      const score = this.score(s),
        d = (score.gold - score.ink) * player;
      if (s.done) return d === 0 ? 0 : Math.sign(d) * 100000 + d;
      let v = d;
      const corners = [0, 5, 30, 35];
      for (const i of corners) {
        v += s.board[i] * player * 130;
        if (!s.board[i])
          for (const [dy, dx] of dirs) {
            const y = Math.floor(i / 6) + dy,
              x = (i % 6) + dx;
            if (y >= 0 && y < 6 && x >= 0 && x < 6) v -= s.board[y * 6 + x] * player * 22;
          }
      }
      v += (this.legal(s, player).length - this.legal(s, -player).length) * 12;
      return v;
    },
    best(s, depth = 4) {
      const moves = this.legal(s);
      if (!moves.length) return null;
      const player = s.turn;
      let nodes = 0;
      const search = (q, d, a, b) => {
        nodes++;
        if (!d || q.done) return this.evaluate(q, player);
        const ms = this.legal(q).sort((x, y) => this.flips(q, y).length - this.flips(q, x).length);
        let value = q.turn === player ? -Infinity : Infinity;
        for (const i of ms) {
          const v = search(this.move(q, i), d - 1, a, b);
          if (q.turn === player) {
            value = Math.max(value, v);
            a = Math.max(a, value);
          } else {
            value = Math.min(value, v);
            b = Math.min(b, value);
          }
          if (b <= a) break;
        }
        return value;
      };
      let best = moves[0],
        value = -Infinity;
      for (const i of moves) {
        const v = search(this.move(s, i), Math.min(5, Math.max(1, depth)) - 1, -Infinity, Infinity);
        if (v > value) {
          value = v;
          best = i;
        }
      }
      return { cell: best, value, nodes };
    },
  };
  const ticTacToe = {
    lines: [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ],
    initial() {
      return { board: Array(9).fill(0), turn: 1, ply: 0, winner: 0, done: false };
    },
    winner(s) {
      for (const [a, b, c] of this.lines)
        if (s.board[a] && s.board[a] === s.board[b] && s.board[a] === s.board[c]) return s.board[a];
      return 0;
    },
    legal(s) {
      return s.done ? [] : s.board.flatMap((v, i) => (v === 0 ? [i] : []));
    },
    move(s, cell) {
      if (!s || s.done) throw Error('This match is finished.');
      if (!integer(cell, 0, 8) || s.board[cell] !== 0) throw Error('Choose an empty square.');
      const q = copy(s);
      q.board[cell] = q.turn;
      q.ply++;
      q.winner = this.winner(q);
      q.done = !!q.winner || q.ply === 9;
      q.turn = q.done ? 0 : -q.turn;
      return q;
    },
    best(s, depth = 9) {
      const moves = this.legal(s);
      if (!moves.length) return null;
      const player = s.turn,
        limit = Math.min(9, Math.max(1, Number.isInteger(depth) ? depth : 9));
      let nodes = 0;
      const memo = new Map();
      const search = (q, d) => {
        nodes++;
        const winner = this.winner(q);
        if (winner) return winner === player ? 100 - q.ply : -100 + q.ply;
        if (q.ply === 9 || d === 0) return 0;
        const key = q.board.join(',') + ':' + q.turn + ':' + d;
        if (memo.has(key)) return memo.get(key);
        const maximizing = q.turn === player;
        let value = maximizing ? -Infinity : Infinity;
        for (const cell of this.legal(q)) {
          const score = search(this.move(q, cell), d - 1);
          value = maximizing ? Math.max(value, score) : Math.min(value, score);
        }
        memo.set(key, value);
        return value;
      };
      let best = moves[0],
        value = -Infinity;
      for (const cell of moves) {
        const score = search(this.move(s, cell), limit - 1);
        if (score > value) {
          value = score;
          best = cell;
        }
      }
      return { cell: best, value, nodes };
    },
    replay(log) {
      if (!Array.isArray(log) || log.length > 9) throw Error('Invalid tic-tac-toe replay.');
      let s = this.initial();
      for (const cell of log) {
        if (!integer(cell, 0, 8)) throw Error('Invalid tic-tac-toe move.');
        s = this.move(s, cell);
      }
      return s;
    },
  };
  const blockShapes = [
    { id: 'single', name: 'Single square', cells: [[0, 0]] },
    {
      id: 'domino-h',
      name: 'Horizontal pair',
      cells: [
        [0, 0],
        [1, 0],
      ],
    },
    {
      id: 'domino-v',
      name: 'Vertical pair',
      cells: [
        [0, 0],
        [0, 1],
      ],
    },
    {
      id: 'tri-h',
      name: 'Three in a row',
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
    },
    {
      id: 'tri-v',
      name: 'Three down',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
    },
    {
      id: 'corner',
      name: 'Corner three',
      cells: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    },
    {
      id: 'square',
      name: 'Small square',
      cells: [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
    },
    {
      id: 'line4-h',
      name: 'Long horizontal',
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    },
    {
      id: 'line4-v',
      name: 'Long vertical',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    },
    {
      id: 'l4-right',
      name: 'Right angle',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
      ],
    },
    {
      id: 'l4-left',
      name: 'Left angle',
      cells: [
        [1, 0],
        [1, 1],
        [1, 2],
        [0, 2],
      ],
    },
    {
      id: 'tee',
      name: 'T shape',
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1],
      ],
    },
    {
      id: 'zig',
      name: 'Zigzag',
      cells: [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
    },
    {
      id: 'line5-h',
      name: 'Five across',
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    },
    {
      id: 'line5-v',
      name: 'Five down',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
    },
    {
      id: 'l5',
      name: 'Long angle',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 3],
      ],
    },
    {
      id: 'cross',
      name: 'Cross',
      cells: [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
    },
    {
      id: 'stair5',
      name: 'Stair step',
      cells: [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
    },
  ];
  const blockShapeById = new Map(blockShapes.map((shape) => [shape.id, shape]));
  function blockPiece(seed, index) {
    return blockShapes[
      Math.floor(random('block-cabinet:' + seed + ':' + index)() * blockShapes.length)
    ].id;
  }
  function blockTray(seed, turn) {
    return [0, 1, 2].map((slot) => blockPiece(seed, turn * 3 + slot));
  }
  const blockCabinet = {
    size: 8,
    shapes: blockShapes.map(copy),
    initial(seed = 'BLOCK-01') {
      seed = seedText(seed);
      return {
        seed,
        board: Array(64).fill(0),
        tray: blockTray(seed, 0),
        score: 0,
        turn: 0,
        done: false,
        lastClear: { rows: [], columns: [] },
      };
    },
    shape(id) {
      const shape = blockShapeById.get(id);
      if (!shape) throw Error('Unknown block piece.');
      return shape;
    },
    cellsAt(s, slot, origin) {
      if (!integer(slot, 0, 2) || !integer(origin, 0, 63))
        throw Error('Choose a block piece and square.');
      const shape = this.shape(s.tray[slot]),
        row = Math.floor(origin / 8),
        column = origin % 8;
      return shape.cells.map(([x, y]) => (row + y) * 8 + column + x);
    },
    legal(s, slot, origin) {
      if (!s || s.done || !Array.isArray(s.board) || s.board.length !== 64) return false;
      if (!integer(slot, 0, 2) || !integer(origin, 0, 63) || !blockShapeById.has(s.tray?.[slot]))
        return false;
      const shape = blockShapeById.get(s.tray[slot]),
        row = Math.floor(origin / 8),
        column = origin % 8;
      return shape.cells.every(([x, y]) => {
        const targetRow = row + y,
          targetColumn = column + x;
        return targetRow < 8 && targetColumn < 8 && s.board[targetRow * 8 + targetColumn] === 0;
      });
    },
    placements(s, slot) {
      if (!integer(slot, 0, 2) || !blockShapeById.has(s?.tray?.[slot])) return [];
      return Array.from({ length: 64 }, (_, cell) => cell).filter((cell) =>
        this.legal(s, slot, cell),
      );
    },
    isGameOver(s) {
      return !!s?.done || ![0, 1, 2].some((slot) => this.placements(s, slot).length);
    },
    move(s, slot, origin) {
      if (!s || s.done) throw Error('This cabinet is closed. Start a new game.');
      if (!this.legal(s, slot, origin)) throw Error('That piece does not fit there.');
      const shape = this.shape(s.tray[slot]),
        board = s.board.slice(),
        cells = this.cellsAt(s, slot, origin);
      cells.forEach((cell) => (board[cell] = 1));
      const rows = Array.from({ length: 8 }, (_, row) => row).filter((row) =>
          Array.from({ length: 8 }, (_, column) => board[row * 8 + column]).every(Boolean),
        ),
        columns = Array.from({ length: 8 }, (_, column) => column).filter((column) =>
          Array.from({ length: 8 }, (_, row) => board[row * 8 + column]).every(Boolean),
        );
      rows.forEach((row) =>
        Array.from({ length: 8 }, (_, column) => (board[row * 8 + column] = 0)),
      );
      columns.forEach((column) =>
        Array.from({ length: 8 }, (_, row) => (board[row * 8 + column] = 0)),
      );
      const q = {
        seed: s.seed,
        board,
        tray: s.tray.slice(),
        score: s.score + shape.cells.length + 10 * (rows.length + columns.length),
        turn: s.turn + 1,
        done: false,
        lastClear: { rows, columns },
      };
      q.tray[slot] = blockPiece(q.seed, q.turn + 2);
      q.done = this.isGameOver(q);
      return q;
    },
    score(s) {
      return Number.isFinite(s?.score) ? s.score : 0;
    },
    replay(seed, log) {
      seed = seedText(seed);
      if (!Array.isArray(log) || log.length > 500) throw Error('Invalid Block Cabinet replay.');
      let s = this.initial(seed);
      for (const action of log) {
        if (
          !action ||
          typeof action !== 'object' ||
          Object.keys(action).sort().join(',') !== 'cell,slot' ||
          !integer(action.slot, 0, 2) ||
          !integer(action.cell, 0, 63)
        )
          throw Error('Invalid Block Cabinet move.');
        s = this.move(s, action.slot, action.cell);
      }
      return s;
    },
  };
  const types = ['home', 'garden', 'cafe', 'library', 'water'];
  const typeInfo = {
    home: {
      name: 'Cottage',
      rule: '2 points + 2 per neighbouring garden + 1 per neighbouring canal.',
    },
    garden: { name: 'Garden', rule: '1 point + 1 per different occupied neighbour type.' },
    cafe: { name: 'Café', rule: '1 point + 3 per neighbouring cottage.' },
    library: {
      name: 'Library',
      rule: '2 points + 2 per neighbouring garden + 2 per neighbouring café.',
    },
    water: { name: 'Canal', rule: '1 point + 1 per neighbouring canal.' },
  };
  function neighbors(i, n = 5) {
    return [-n, 1, n, -1]
      .map((d) => i + d)
      .filter(
        (j) =>
          j >= 0 &&
          j < n * n &&
          Math.abs(Math.floor(j / n) - Math.floor(i / n)) + Math.abs((j % n) - (i % n)) === 1,
      );
  }
  const borough = {
    types,
    typeInfo,
    initial(seed) {
      seed = seedText(seed);
      const r = random('borough-1:' + seed),
        deck = Array.from({ length: 80 }, () => types[Math.floor(r() * types.length)]),
        board = Array(25).fill(null),
        rivers = [1 + Math.floor(r() * 3), 11 + Math.floor(r() * 3), 21 + Math.floor(r() * 3)];
      rivers.forEach((i) => (board[i] = 'water'));
      const opening = types.slice().sort((a, b) => hash(seed + ':' + a) - hash(seed + ':' + b));
      deck.splice(0, 3, ...opening.slice(0, 3));
      return {
        seed,
        board,
        fixed: rivers,
        deck,
        offers: deck.slice(0, 3),
        cursor: 3,
        turn: 0,
        done: false,
        log: [],
      };
    },
    breakdown(s) {
      return s.board.map((v, i) => {
        if (!v) return 0;
        const ns = neighbors(i)
            .map((j) => s.board[j])
            .filter(Boolean),
          count = (t) => ns.filter((x) => x === t).length;
        return v === 'home'
          ? 2 + 2 * count('garden') + count('water')
          : v === 'garden'
            ? 1 + new Set(ns).size
            : v === 'cafe'
              ? 1 + 3 * count('home')
              : v === 'library'
                ? 2 + 2 * count('garden') + 2 * count('cafe')
                : 1 + count('water');
      });
    },
    score(s) {
      return this.breakdown(s).reduce((a, b) => a + b, 0);
    },
    move(s, slot, cell) {
      if (s.done) throw Error('This town is complete.');
      if (!integer(slot, 0, 2) || !integer(cell, 0, 24) || s.board[cell])
        throw Error('Choose a plan and an empty plot.');
      const q = copy(s);
      q.board[cell] = q.offers[slot];
      q.offers[slot] = q.deck[q.cursor++];
      q.turn++;
      q.log.push({ slot, cell });
      q.done = q.turn >= 18;
      return q;
    },
    replay(seed, log) {
      if (!Array.isArray(log) || log.length > 18) throw Error('Invalid town replay.');
      let s = this.initial(seed);
      for (const a of log) {
        if (!a || Object.keys(a).sort().join(',') !== 'cell,slot') throw Error('Invalid move.');
        s = this.move(s, a.slot, a.cell);
      }
      return s;
    },
  };
  // Original compact warehouses. Several valid solutions are normal in a planning game.
  const warehouseMaps = [
    {
      name: 'The receiving room',
      subtitle: 'One crate. A little room to think.',
      map: ['#######', '#     #', '# . $ #', '#  @  #', '#     #', '#######'],
    },
    {
      name: 'Two loose ends',
      subtitle: 'Leave yourself a way around.',
      map: ['#######', '# . . #', '# $ $ #', '#  @  #', '#     #', '#######'],
    },
    {
      name: 'The side entrance',
      subtitle: 'A wall changes the approach.',
      map: ['#######', '#  .  #', '# #   #', '#  $  #', '# @   #', '#######'],
    },
    {
      name: 'Special collections',
      subtitle: 'Position before pushing.',
      map: ['########', '# .  . #', '#      #', '#  $$  #', '#  @   #', '#      #', '########'],
    },
    {
      name: 'The narrow margin',
      subtitle: 'Do not confuse moving with making progress.',
      map: ['########', '# .  . #', '#  #   #', '#  $ $ #', '# @    #', '#      #', '########'],
    },
    {
      name: 'The last delivery',
      subtitle: 'Three records, one evening.',
      map: ['########', '# . . .#', '#      #', '# $$$  #', '#   @  #', '#      #', '########'],
    },
  ];
  const warehouse = {
    maps: warehouseMaps,
    fromMap(map, level = null) {
      if (!Array.isArray(map) || map.length < 3 || map.length > 20)
        throw Error('Invalid archive map.');
      const w = typeof map[0] === 'string' ? map[0].length : 0;
      if (w < 3 || w > 30 || map.some((row) => typeof row !== 'string' || row.length !== w))
        throw Error('Invalid archive map dimensions.');
      const flat = map.join(''),
        walls = [],
        goals = [],
        crates = [];
      let player = -1;
      [...flat].forEach((c, i) => {
        if (!'# .@$+*'.includes(c)) throw Error('Invalid archive map tile.');
        if (c === '#') walls.push(i);
        if ('.+*'.includes(c)) goals.push(i);
        if ('$*'.includes(c)) crates.push(i);
        if ('@+'.includes(c)) player = i;
      });
      if (player < 0 || crates.length < 1 || crates.length !== goals.length)
        throw Error('Invalid archive map pieces.');
      return {
        level,
        w,
        h: map.length,
        walls,
        goals,
        crates,
        player,
        moves: 0,
        pushes: 0,
        done: false,
      };
    },
    initial(level = 0) {
      if (!integer(level, 0, warehouseMaps.length - 1)) throw Error('Unknown archive.');
      return this.fromMap(warehouseMaps[level].map, level);
    },
    move(s, direction) {
      const ds = { up: -s.w, right: 1, down: s.w, left: -1 };
      if (!(direction in ds)) throw Error('Unknown direction.');
      if (s.done) return s;
      const d = ds[direction],
        next = s.player + d;
      if (
        next < 0 ||
        next >= s.w * s.h ||
        Math.abs(Math.floor(next / s.w) - Math.floor(s.player / s.w)) +
          Math.abs((next % s.w) - (s.player % s.w)) !==
          1 ||
        s.walls.includes(next)
      )
        return s;
      const q = copy(s),
        ci = q.crates.indexOf(next);
      if (ci >= 0) {
        const beyond = next + d;
        if (
          beyond < 0 ||
          beyond >= s.w * s.h ||
          s.walls.includes(beyond) ||
          s.crates.includes(beyond) ||
          Math.abs(Math.floor(beyond / s.w) - Math.floor(next / s.w)) +
            Math.abs((beyond % s.w) - (next % s.w)) !==
            1
        )
          return s;
        q.crates[ci] = beyond;
        q.pushes++;
      }
      q.player = next;
      q.moves++;
      q.done = q.crates.every((i) => q.goals.includes(i));
      return q;
    },
    corners(s) {
      return s.crates.filter(
        (i) =>
          !s.goals.includes(i) &&
          [
            [-s.w, -1],
            [-s.w, 1],
            [s.w, -1],
            [s.w, 1],
          ].some((ds) => ds.every((d) => s.walls.includes(i + d))),
      );
    },
    solve(start, max = 150000) {
      const key = (s) =>
          s.player +
          ':' +
          s.crates
            .slice()
            .sort((a, b) => a - b)
            .join(','),
        seen = new Set([key(start)]),
        queue = [{ s: start, path: '' }];
      for (let at = 0; at < queue.length && at < max; at++) {
        const { s, path } = queue[at];
        if (s.done) return { path, nodes: at + 1 };
        for (const [d, ch] of [
          ['up', 'U'],
          ['right', 'R'],
          ['down', 'D'],
          ['left', 'L'],
        ]) {
          const q = this.move(s, d);
          if (q === s || this.corners(q).length) continue;
          const k = key(q);
          if (!seen.has(k)) {
            seen.add(k);
            queue.push({ s: q, path: path + ch });
          }
        }
      }
      return { path: null, nodes: seen.size };
    },
  };
  // Original reviewed region boards. Answers stay in the authoring source, not this engine.
  const gardenLayouts = [
    {
      id: 'garden-1',
      revision: 1,
      title: 'Window boxes',
      size: 6,
      regions: [
        1, 1, 0, 0, 0, 2, 1, 1, 1, 1, 1, 2, 3, 3, 3, 1, 1, 2, 3, 3, 3, 1, 1, 1, 4, 4, 4, 4, 1, 1, 4,
        5, 4, 4, 4, 4,
      ],
    },
    {
      id: 'garden-2',
      revision: 1,
      title: 'The orchard gate',
      size: 6,
      regions: [
        0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 3, 2, 2, 2, 1, 1, 4, 4, 2, 2, 1,
        1, 4, 4, 5, 5,
      ],
    },
    {
      id: 'garden-3',
      revision: 1,
      title: 'The glass walk',
      size: 6,
      regions: [
        1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 2, 4, 4, 4, 4, 2, 2, 4, 4, 4, 3, 3, 3, 4, 4, 5, 3, 5, 5, 4,
        4, 5, 5, 5, 5,
      ],
    },
    {
      id: 'garden-4',
      revision: 1,
      title: 'After the rain',
      size: 7,
      regions: [
        0, 0, 0, 1, 1, 1, 3, 0, 2, 0, 1, 1, 3, 3, 0, 2, 0, 3, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 4, 4, 5, 5, 3, 3, 6, 6, 4, 5, 5, 3, 6, 6, 6, 4,
      ],
    },
    {
      id: 'garden-5',
      revision: 1,
      title: 'The walled garden',
      size: 7,
      regions: [
        0, 0, 1, 1, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 4, 4, 4, 1, 2, 2, 2, 4, 4, 4, 4, 2, 2, 3, 4, 4, 4,
        2, 2, 2, 2, 4, 4, 4, 5, 5, 5, 6, 4, 4, 5, 5, 5, 6, 6,
      ],
    },
    {
      id: 'garden-6',
      revision: 1,
      title: 'Lantern night',
      size: 7,
      regions: [
        1, 0, 0, 0, 4, 2, 2, 1, 0, 5, 5, 4, 2, 2, 5, 5, 5, 3, 4, 4, 2, 5, 5, 5, 3, 4, 4, 4, 5, 5, 5,
        5, 4, 4, 4, 5, 5, 5, 5, 5, 4, 4, 5, 6, 6, 6, 6, 6, 4,
      ],
    },
  ];
  const regionGardens = {
    layouts: gardenLayouts,
    initial(level = 0) {
      if (!integer(level, 0, gardenLayouts.length - 1)) throw Error('Unknown garden.');
      return { level, marks: Array(gardenLayouts[level].size ** 2).fill(0), done: false };
    },
    conflicts(s) {
      const p = gardenLayouts[s.level],
        n = p.size;
      const tokens = s.marks.flatMap((v, i) => (v === 1 ? [i] : [])),
        bad = new Set();
      for (let a = 0; a < tokens.length; a++)
        for (let b = a + 1; b < tokens.length; b++) {
          const i = tokens[a],
            j = tokens[b],
            x = i % n,
            y = Math.floor(i / n),
            xx = j % n,
            yy = Math.floor(j / n);
          if (
            x === xx ||
            y === yy ||
            p.regions[i] === p.regions[j] ||
            (Math.abs(x - xx) <= 1 && Math.abs(y - yy) <= 1)
          ) {
            bad.add(i);
            bad.add(j);
          }
        }
      return [...bad];
    },
    move(s, cell) {
      if (s.done || !integer(cell, 0, s.marks.length - 1))
        throw Error('Choose a square in an unfinished garden.');
      const q = copy(s);
      q.marks[cell] = (q.marks[cell] + 1) % 3;
      q.done =
        q.marks.filter((v) => v === 1).length === gardenLayouts[q.level].size &&
        this.conflicts(q).length === 0;
      return q;
    },
    replay(level, log) {
      if (!Array.isArray(log) || log.length > 3000) throw Error('Invalid garden replay.');
      let s = this.initial(level);
      for (const cell of log) s = this.move(s, cell);
      return s;
    },
  };
  const api = {
    regionGardens,
    version: 1,
    hash,
    random,
    seedText,
    neighbors,
    copy,
    reversi,
    ticTacToe,
    tictactoe: ticTacToe,
    blockCabinet,
    blockcabinet: blockCabinet,
    borough,
    warehouse,
  };
  root.AlibiClubEngines = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
