/* Deterministic world generation and atomic city edits. No DOM, storage or clock. */
(function (G) {
  'use strict';
  const E = G.QWEngine;
  const LAYOUTS = {
    harbour: 'Harbour town',
    river: 'River village',
    hillfort: 'Castle on the hill',
    woodland: 'Woodland retreat',
  };
  const BLUEPRINTS = {
    courtyard: {
      name: 'Castle courtyard',
      rows: ['TWWWWT', 'W....W', 'W.K..W', 'W....W', 'W....W', 'TWWGWT'],
      legend: { T: 'tower', W: 'wall', K: 'keep', G: 'gate' },
    },
    hamlet: {
      name: 'Village square',
      rows: ['H.H.H', '.....', '..M..', '.....', 'H.L.H'],
      legend: { H: 'cottage', M: 'market', L: 'library' },
    },
    farmstead: {
      name: 'Farmstead',
      rows: ['B.F.F', '.....', 'O.F.F', '.....', 'O.W.O'],
      legend: { B: 'barn', F: 'farm', O: 'orchard', W: 'windmill' },
    },
  };
  function random(seed) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function validIndex(s, i) {
    return Number.isInteger(i) && i >= 0 && i < s.tiles.length;
  }
  function neighbors(s, i) {
    const x = i % s.size,
      y = Math.floor(i / s.size);
    return [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ]
      .filter(([a, b]) => a >= 0 && b >= 0 && a < s.size && b < s.size)
      .map(([a, b]) => b * s.size + a);
  }
  function isRoad(t) {
    return t.ground === 'path' || t.items.some((i) => i.type === 'bridge' || i.type === 'gate');
  }
  function connections(s, i) {
    if (!validIndex(s, i) || !isRoad(s.tiles[i])) return [];
    return neighbors(s, i).filter(
      (j) => isRoad(s.tiles[j]) && Math.abs(s.tiles[j].height - s.tiles[i].height) <= 1,
    );
  }
  function finish(before, after) {
    if (JSON.stringify(before) === JSON.stringify(after))
      return { error: 'No change to your town.' };
    try {
      E.validateScene(after);
    } catch (e) {
      return { error: e.message };
    }
    return { whole: true, before: E.clone(before), after };
  }
  function area(s, index, width, action) {
    if (!validIndex(s, index) || ![1, 3, 5].includes(width))
      return { error: 'Choose a plot and brush size.' };
    const after = E.clone(s),
      cx = index % s.size,
      cy = Math.floor(index / s.size),
      r = Math.floor(width / 2);
    for (let y = Math.max(0, cy - r); y <= Math.min(s.size - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(s.size - 1, cx + r); x++) {
        const p = E.editScene(after, { ...action, index: y * s.size + x });
        if (p.error) {
          // Empty erases and clamped heights are harmless; illegal flooding never partially applies.
          if (p.error === 'This plot is already empty.' || p.error === 'No change at this plot.')
            continue;
          return { error: p.error };
        }
        after.tiles[p.index] = p.after;
      }
    return finish(s, after);
  }
  function transfer(s, from, to, copy = false) {
    if (!validIndex(s, from) || !validIndex(s, to) || from === to)
      return { error: 'Choose two different plots.' };
    if (!s.tiles[from].items.length) return { error: 'Choose a plot with a building first.' };
    const after = E.clone(s),
      item = after.tiles[from].items.at(-1);
    const patch = E.editScene(after, { kind: 'build', index: to, ...item });
    if (patch.error) return patch;
    if (!copy) after.tiles[from].items.pop();
    after.tiles[to] = patch.after;
    return finish(s, after);
  }
  function road(s, from, to) {
    if (!validIndex(s, from) || !validIndex(s, to))
      return { error: 'Choose the start and end of your road.' };
    // Shortest traversable path; existing buildings are obstacles, and water receives bridges.
    const parents = new Map([[from, -1]]),
      queue = [from];
    const passable = (i) =>
      !s.tiles[i].items.length ||
      s.tiles[i].items.every((a) => ['bridge', 'gate'].includes(a.type));
    if (!passable(from) || !passable(to))
      return { error: 'Road endpoints need clear ground, a bridge or a gate.' };
    for (let p = 0; p < queue.length && !parents.has(to); p++) {
      const i = queue[p];
      for (const j of neighbors(s, i)) {
        if (parents.has(j) || !passable(j) || Math.abs(s.tiles[j].height - s.tiles[i].height) > 1)
          continue;
        parents.set(j, i);
        queue.push(j);
      }
    }
    if (!parents.has(to))
      return { error: 'No clear route. Leave a gap or soften the steep land first.' };
    const route = [];
    for (let i = to; i !== -1; i = parents.get(i)) route.unshift(i);
    const after = E.clone(s);
    for (let k = 0; k < route.length; k++) {
      const i = route[k],
        t = after.tiles[i];
      if (t.ground === 'water') {
        const adjacent = route[k + 1] ?? route[k - 1];
        t.items = [
          {
            type: 'bridge',
            palette: 'terracotta',
            rot: adjacent !== undefined && Math.abs(adjacent - i) === 1 ? 1 : 0,
          },
        ];
      } else t.ground = 'path';
    }
    return finish(s, after);
  }
  function stamp(s, index, id, palette = 'terracotta', rotation = 0) {
    const b = BLUEPRINTS[id];
    if (
      !b ||
      !validIndex(s, index) ||
      !Object.hasOwn(E.PALETTES, palette) ||
      !Number.isInteger(rotation) ||
      rotation < 0 ||
      rotation > 3
    )
      return { error: 'Choose a neighbourhood and a plot.' };
    const after = E.clone(s),
      ox = index % s.size,
      oy = Math.floor(index / s.size),
      n = b.rows.length;
    const height = s.tiles[index].height;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let dx = x,
          dy = y;
        for (let r = 0; r < rotation; r++) [dx, dy] = [n - 1 - dy, dx];
        if (ox + dx >= s.size || oy + dy >= s.size)
          return { error: `This neighbourhood needs ${n} × ${n} clear plots.` };
        const i = (oy + dy) * s.size + ox + dx,
          t = after.tiles[i];
        if (t.items.length || t.ground === 'water' || t.height !== height)
          return {
            error: 'A neighbourhood needs clear, dry, level ground. Existing buildings stay safe.',
          };
        const type = b.legend[b.rows[y][x]];
        t.ground = 'path';
        if (type)
          t.items = [
            {
              type,
              palette,
              rot: (rotation + (type === 'wall' && (x === 0 || x === n - 1) ? 1 : 0)) % 4,
            },
          ];
      }
    return finish(s, after);
  }
  function generate({ seed = 'bellweather', layout = 'harbour', size = 20, density = 0.5 } = {}) {
    if (
      typeof seed !== 'string' ||
      seed.length < 1 ||
      seed.length > 64 ||
      !Object.hasOwn(LAYOUTS, layout) ||
      !E.SIZES.includes(size) ||
      !Number.isFinite(density) ||
      density < 0 ||
      density > 1
    )
      throw Error('Choose a seed, landscape, map size and density.');
    const rng = random(seed + ':' + layout + ':' + size),
      s = E.emptyScene(size);
    s.name = `${LAYOUTS[layout]} · ${seed}`.slice(0, 64);
    const mid = Math.floor(size / 2),
      palettes = Object.keys(E.PALETTES);
    const riverX = Array.from(
      { length: size },
      (_, y) => mid + Math.round(Math.sin(y * 0.43 + rng()) * 2),
    );
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const t = s.tiles[y * size + x],
          edge = Math.min(x, y, size - x - 1, size - y - 1);
        if (
          edge === 0 ||
          (layout === 'harbour' && x < 3 + Math.sin(y * 0.5)) ||
          (layout === 'river' && Math.abs(x - riverX[y]) < 1.3)
        )
          t.ground = 'water';
        else if (edge === 1) t.ground = 'sand';
        if (layout === 'hillfort' && x >= size - 9 && x <= size - 2 && y >= 2 && y <= 9) {
          t.ground = 'stone';
          t.height = x === size - 9 || x === size - 2 || y === 2 || y === 9 ? 1 : 2;
        }
      }
    if (layout === 'hillfort') {
      const p = stamp(s, 3 * size + size - 8, 'courtyard');
      if (p.error) throw Error(p.error);
      s.tiles = p.after.tiles;
    }
    const lanes = [Math.floor(size * 0.38), Math.floor(size * 0.72)];
    for (const y of lanes) {
      const p = road(s, y * size + 1, y * size + size - 2);
      if (!p.error) s.tiles = p.after.tiles;
    }
    for (const x of lanes) {
      const p = road(s, size + x, (size - 2) * size + x);
      if (!p.error) s.tiles = p.after.tiles;
    }
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i];
      if (t.ground === 'water' || t.ground === 'path' || t.items.length) continue;
      const roadside = neighbors(s, i).some((j) => isRoad(s.tiles[j]));
      const r = rng();
      let type;
      if (roadside && r < density * 0.85)
        type = ['cottage', 'townhouse', 'inn', 'library', 'market', 'barn'][Math.floor(rng() * 6)];
      else if (r < (layout === 'woodland' ? 0.58 : 0.24)) type = rng() < 0.6 ? 'tree' : 'pine';
      else if (r < 0.32) type = rng() < 0.5 ? 'flowers' : 'farm';
      if (type)
        t.items = [
          {
            type,
            palette: palettes[Math.floor(rng() * palettes.length)],
            rot: Math.floor(rng() * 4),
          },
        ];
    }
    return E.validateScene(s);
  }
  function describe(s) {
    const groups = [],
      seen = new Set();
    for (let i = 0; i < s.tiles.length; i++) {
      if (!isRoad(s.tiles[i]) || seen.has(i)) continue;
      const group = [i];
      seen.add(i);
      for (let p = 0; p < group.length; p++)
        for (const j of connections(s, group[p]))
          if (!seen.has(j)) {
            seen.add(j);
            group.push(j);
          }
      groups.push(group);
    }
    const main = new Set(groups.sort((a, b) => b.length - a.length)[0] || []);
    let homes = 0,
      residents = 0,
      connected = 0,
      nature = 0,
      buildings = 0;
    s.tiles.forEach((t, i) => {
      for (const item of t.items) {
        const category = E.TYPES[item.type][0];
        if (category === 'Nature') nature++;
        else buildings++;
        if (['cottage', 'townhouse', 'inn'].includes(item.type)) {
          homes++;
          residents += item.type === 'townhouse' ? 8 : item.type === 'inn' ? 6 : 4;
          if (
            neighbors(s, i).some((j) => main.has(j) && Math.abs(s.tiles[j].height - t.height) <= 1)
          )
            connected++;
        }
      }
    });
    return {
      homes,
      residents,
      connected,
      nature,
      buildings,
      roadPlots: seen.size,
      districts: groups.length,
    };
  }
  G.QWCity = {
    LAYOUTS,
    BLUEPRINTS,
    random,
    neighbors,
    isRoad,
    connections,
    area,
    transfer,
    road,
    stamp,
    generate,
    describe,
  };
  if (typeof module !== 'undefined') module.exports = G.QWCity;
})(typeof window === 'undefined' ? globalThis : window);
