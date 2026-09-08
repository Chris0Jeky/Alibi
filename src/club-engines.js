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
    initial(level = 0) {
      if (!integer(level, 0, warehouseMaps.length - 1)) throw Error('Unknown archive.');
      const m = warehouseMaps[level].map,
        w = m[0].length,
        flat = m.join(''),
        walls = [],
        goals = [],
        crates = [];
      let player = -1;
      [...flat].forEach((c, i) => {
        if (c === '#') walls.push(i);
        if ('.+*'.includes(c)) goals.push(i);
        if ('$*'.includes(c)) crates.push(i);
        if ('@+'.includes(c)) player = i;
      });
      return {
        level,
        w,
        h: m.length,
        walls,
        goals,
        crates,
        player,
        moves: 0,
        pushes: 0,
        done: false,
      };
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
  const api = { version: 1, hash, random, seedText, neighbors, copy, reversi, borough, warehouse };
  root.AlibiClubEngines = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
