'use strict';
// Offline candidate sketches, not a runtime generator or an automatic publication gate.
require('../../src/core.js');
require('../../src/engines.js');
const C = require('../../src/bridges.js');
const X = C.extras;
const { range, adjacent, near } = require('../../tests/helpers/family-studies-shared.cjs');
const { bridgesGraph } = require('../../tests/helpers/family-studies-oracle.cjs');
const families = ['lightup', 'tents', 'aquarium', 'network', 'trail', 'bridges', 'binary', 'futoshiki'];
function random(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid seed');
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function candidate(type, seed) {
  if (!families.includes(type)) throw Error(`Unsupported family: ${type}`);
  const rnd = random(seed);
  const pick = (values) => values[Math.floor(rnd() * values.length)];
  const shuffle = (values) => {
    const out = values.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const size = type === 'bridges' ? 9 : type === 'binary' ? 8 : type === 'trail' ? 6 : 7;
  const p = { id: `night-${type}-candidate`, revision: 1, type, title: 'Unpublished candidate', subtitle: 'Night studies', difficulty: 'Expert', difficultyStatus: 'provisional', size };
  const cells = range(size ** 2);
  const unique = (budget = type === 'futoshiki' ? 6000 : 60000) => {
    try {
      const result = C.solve(p, null, 2, budget);
      return result.nodes < budget && result.solutions.length === 1 && JSON.stringify(result.solutions[0]) === JSON.stringify(p.solution);
    } catch { return false; }
  };
  if (type === 'lightup') {
    p.walls = cells.map(() => rnd() < 0.27 ? -1 : -2);
    if (p.walls.filter((v) => v === -1).length < 9) return null;
    p.solution = cells.map(() => 0);
    for (const i of shuffle(cells.filter((i) => p.walls[i] === -2))) {
      if (!X.litCells(p, { cells: p.solution }).has(i)) p.solution[i] = 1;
    }
    p.walls = p.walls.map((v, i) => v === -1 ? adjacent(i, size).filter((j) => p.solution[j]).length : v);
    if (!unique()) return null;
    for (const i of shuffle(cells.filter((i) => p.walls[i] >= 0))) {
      const before = p.walls[i];
      p.walls[i] = -1;
      if (!unique()) p.walls[i] = before;
    }
  } else if (type === 'tents') {
    const tents = [];
    for (const i of shuffle(cells)) {
      if (tents.length === 10 + seed % 2) break;
      if (tents.every((j) => !near(i, j, size))) tents.push(i);
    }
    if (tents.length < 10) return null;
    p.trees = [];
    for (const tent of tents) {
      const options = adjacent(tent, size).filter((j) => !tents.includes(j) && !p.trees.includes(j));
      if (!options.length) return null;
      p.trees.push(pick(options));
    }
    p.trees.sort((a, b) => a - b);
    p.solution = cells.map((i) => Number(tents.includes(i)));
    const counts = X.lineCounts(p, p.solution);
    p.rowTargets = counts.rows;
    p.colTargets = counts.cols;
  } else if (type === 'aquarium') {
    const count = 9;
    p.tanks = cells.map(() => -1);
    shuffle(cells).slice(0, count).forEach((cell, tank) => { p.tanks[cell] = tank; });
    for (let remaining = cells.length - count; remaining; remaining--) {
      const frontier = cells.filter((cell) => p.tanks[cell] < 0 && adjacent(cell, size).some((j) => p.tanks[j] >= 0));
      const cell = pick(frontier);
      const neighbors = adjacent(cell, size).filter((j) => p.tanks[j] >= 0);
      p.tanks[cell] = p.tanks[pick(neighbors)];
    }
    if (range(count).some((tank) => p.tanks.filter((v) => v === tank).length < 2)) return null;
    const rows = X.tankRows(p);
    p.solution = rows.map((r) => Math.floor(rnd() * (r.length + 1)));
    const counts = X.lineCounts(p, X.aquariumCells(p, { levels: p.solution }));
    p.rowTargets = counts.rows;
    p.colTargets = counts.cols;
  } else if (type === 'network') {
    // Growing-tree mixture: more branching than a pure depth-first corridor.
    const masks = cells.map(() => 0);
    const visited = new Set([pick(cells)]);
    const stack = [...visited];
    while (stack.length) {
      const position = rnd() < 0.78 ? stack.length - 1 : Math.floor(rnd() * stack.length);
      const cell = stack[position];
      const directions = range(4).filter((d) => X.step(cell, d, size) >= 0 && !visited.has(X.step(cell, d, size)));
      if (!directions.length) { stack.splice(position, 1); continue; }
      const d = pick(directions);
      const next = X.step(cell, d, size);
      masks[cell] |= X.bits[d];
      masks[next] |= X.op[d];
      visited.add(next);
      stack.push(next);
    }
    p.source = 24;
    p.locked = [];
    p.tiles = masks.map((mask) => X.rot(mask, Math.floor(rnd() * 4)));
    p.solution = masks.map((mask, cell) => range(4).find((r) => X.rot(p.tiles[cell], r) === mask));
  } else if (type === 'trail') {
    const used = new Set();
    const path = [];
    let nodes = 0;
    function visit(cell) {
      if (++nodes > 30000) return false;
      used.add(cell); path.push(cell);
      if (path.length === cells.length) return true;
      const options = shuffle(adjacent(cell, size).filter((j) => !used.has(j))).sort((a, b) => adjacent(a, size).filter((j) => !used.has(j)).length - adjacent(b, size).filter((j) => !used.has(j)).length);
      for (const next of options) if (visit(next)) return true;
      used.delete(cell); path.pop();
      return false;
    }
    if (!visit(pick(cells))) return null;
    p.solution = cells.map(() => 0);
    path.forEach((cell, i) => { p.solution[cell] = i + 1; });
    p.givens = p.solution.slice();
    for (const i of shuffle(cells.filter((i) => ![1, cells.length].includes(p.solution[i])))) {
      const before = p.givens[i];
      p.givens[i] = 0;
      if (!unique()) p.givens[i] = before;
    }
  } else if (type === 'bridges') {
    p.islands = shuffle(cells).slice(0, 15 + seed % 2).sort((a, b) => a - b).map((cell) => ({ cell, count: 1 }));
    const g = bridgesGraph(p);
    if (g.edges.length < 19 || g.edges.length > 24 || g.crosses.filter((v) => v.length).length < 4) return null;
    p.solution = g.edges.map(() => 0);
    const parents = range(p.islands.length);
    const root = (i) => { while (parents[i] !== i) i = parents[i]; return i; };
    for (const index of shuffle(range(g.edges.length))) {
      const e = g.edges[index];
      if (root(e.a) === root(e.b) || g.crosses[index].some((j) => p.solution[j])) continue;
      parents[root(e.a)] = root(e.b);
      p.solution[index] = rnd() < 0.6 ? 2 : 1;
    }
    if (new Set(parents.map((_, i) => root(i))).size !== 1) return null;
    for (const index of shuffle(range(g.edges.length))) {
      if (!p.solution[index] && rnd() < 0.15 && !g.crosses[index].some((j) => p.solution[j])) p.solution[index] = 1;
    }
    p.islands.forEach((island, i) => { island.count = g.incident[i].reduce((sum, edge) => sum + p.solution[edge], 0); });
  } else if (type === 'binary') {
    const lines = range(1 << size).map((mask) => range(size).map((i) => (mask >> i) & 1)).filter((line) => line.reduce((a, b) => a + b, 0) === size / 2 && !line.some((v, i) => i >= 2 && v === line[i - 1] && v === line[i - 2]));
    const chosen = [];
    let nodes = 0;
    function visit() {
      if (++nodes > 50000) return false;
      const row = chosen.length;
      if (row === size) return new Set(range(size).map((col) => chosen.map((line) => line[col]).join(''))).size === size;
      for (const line of shuffle(lines)) {
        if (chosen.some((other) => other.join('') === line.join(''))) continue;
        if (line.some((v, col) => {
          const sum = chosen.reduce((sum, prior) => sum + prior[col], v);
          return sum > size / 2 || sum + size - row - 1 < size / 2 || row >= 2 && chosen[row - 1][col] === v && chosen[row - 2][col] === v;
        })) continue;
        chosen.push(line);
        if (visit()) return true;
        chosen.pop();
      }
      return false;
    }
    if (!visit()) return null;
    p.solution = chosen.flat(); p.givens = p.solution.slice();
    for (const i of shuffle(cells)) {
      const row = Math.floor(i / size); const col = i % size;
      if (p.givens.slice(row * size, (row + 1) * size).filter((v) => v >= 0).length <= 1 || p.givens.filter((v, j) => j % size === col && v >= 0).length <= 1) continue;
      const before = p.givens[i]; p.givens[i] = -1;
      if (!unique()) p.givens[i] = before;
    }
  } else if (type === 'futoshiki') {
    const grid = cells.map(() => 0);
    let nodes = 0;
    function fill() {
      if (++nodes > 50000) return false;
      let cell = -1; let options;
      for (const i of shuffle(cells.filter((i) => !grid[i]))) {
        const row = Math.floor(i / size); const col = i % size;
        const choices = range(size).map((v) => v + 1).filter((v) => !grid.some((other, j) => other === v && (Math.floor(j / size) === row || j % size === col)));
        if (!choices.length) return false;
        if (cell < 0 || choices.length < options.length) { cell = i; options = choices; }
      }
      if (cell < 0) return true;
      for (const value of shuffle(options)) { grid[cell] = value; if (fill()) return true; }
      grid[cell] = 0; return false;
    }
    if (!fill()) return null;
    p.solution = grid.slice(); p.givens = cells.map(() => 0);
    shuffle(cells).slice(0, 6).forEach((cell) => { p.givens[cell] = grid[cell]; });
    p.inequalities = cells.flatMap((a) => adjacent(a, size).filter((b) => b > a).map((b) => ({ a, b, op: grid[a] < grid[b] ? '<' : '>' })));
    if (!unique()) return null;
    for (const constraint of shuffle(p.inequalities)) {
      const index = p.inequalities.indexOf(constraint);
      p.inequalities.splice(index, 1);
      if (!unique()) p.inequalities.splice(index, 0, constraint);
    }
  }
  try { C.validateDefinition(p); } catch { return null; }
  return unique() ? p : null;
}
module.exports = { random, candidate, families };
