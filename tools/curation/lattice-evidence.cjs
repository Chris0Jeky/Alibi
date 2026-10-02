'use strict';
// Authoring evidence only. Not shipped to the app or its import/hint workers.
const Q = require('./study-quality.cjs');
const V = require('./vault-quality.cjs');
const adjacent = (i, n) =>
  [i - n, i + n, i - 1, i + 1].filter(
    (j) =>
      j >= 0 &&
      j < n * n &&
      Math.abs(Math.floor(i / n) - Math.floor(j / n)) + Math.abs((i % n) - (j % n)) === 1,
  );

function opening(p) {
  const n = p.size;
  if (p.type === 'futoshiki') {
    const edges = Array.from({ length: n * n }, () => []),
      memo = new Map(),
      active = new Set();
    for (const q of p.inequalities) {
      const low = q.op === '<' ? q.a : q.b,
        high = q.op === '<' ? q.b : q.a;
      edges[low].push(high);
    }
    function longest(i) {
      if (active.has(i)) throw Error('Inequality cycle cannot provide a valid opening');
      if (memo.has(i)) return memo.get(i);
      active.add(i);
      let best = [i];
      for (const j of edges[i]) {
        const candidate = [i, ...longest(j)];
        if (candidate.length > best.length) best = candidate;
      }
      active.delete(i);
      memo.set(i, best);
      return best;
    }
    const cells = edges.map((_, i) => longest(i)).sort((a, b) => b.length - a.length)[0];
    if (cells.length > n) throw Error('Inequality chain exceeds the value range');
    const directions = cells
      .slice(1)
      .map((cell, i) => (Math.abs(cell - cells[i]) === 1 ? 'h' : 'v'));
    return {
      kind: 'inequality-chain',
      cells,
      startRange: [1, n - cells.length + 1],
      endRange: [cells.length, n],
      crossAxis: new Set(directions).size === 2,
    };
  }
  if (p.type !== 'lightup') throw Error('Unsupported Lattice family');
  const forbidden = new Set();
  p.walls.forEach((wall, i) => {
    if (wall === 0) adjacent(i, n).forEach((j) => forbidden.add(j));
  });
  const clues = p.walls.flatMap((wall, i) =>
    wall > 0
      ? [{ cell: i, required: wall, neighbors: adjacent(i, n).filter((j) => p.walls[j] === -2) }]
      : [],
  );
  clues.sort(
    (a, b) =>
      a.neighbors.length - a.required - (b.neighbors.length - b.required) || a.cell - b.cell,
  );
  if (!clues.length) throw Error('A Lattice lamp study needs a numbered opening');
  const clue = clues[0];
  const views = p.walls.flatMap((wall, i) => {
    if (wall !== -2) return [];
    const visible = [i];
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      let r = Math.floor(i / n) + dr,
        c = (i % n) + dc;
      while (r >= 0 && c >= 0 && r < n && c < n && p.walls[r * n + c] === -2) {
        visible.push(r * n + c);
        r += dr;
        c += dc;
      }
    }
    const sources = visible.filter((j) => !forbidden.has(j)).sort((a, b) => a - b);
    const crossAxis =
      sources.some((j) => Math.floor(j / n) !== Math.floor(i / n)) &&
      sources.some((j) => j % n !== i % n);
    return sources.length >= 2 && crossAxis
      ? [{ cell: i, sources, coupled: sources.some((j) => clue.neighbors.includes(j)) }]
      : [];
  });
  views.sort(
    (a, b) =>
      Number(b.coupled) - Number(a.coupled) ||
      a.sources.length - b.sources.length ||
      a.cell - b.cell,
  );
  if (!views.length) throw Error('No crossing visibility opening');
  return { kind: 'wall-and-visibility', clue, coverage: views[0] };
}
function eligible(p) {
  const m = Q.metrics(p),
    profile = V.profile(p),
    start = opening(p);
  if (m.size !== 7 || !Number.isInteger(profile.unresolved)) return false;
  if (p.type === 'futoshiki')
    return (
      m.givens === 6 &&
      m.horizontal >= 6 &&
      m.vertical >= 6 &&
      profile.unresolved >= 20 &&
      start.cells.length >= 4 &&
      start.crossAxis
    );
  return (
    m.white >= 30 &&
    m.numbered >= 3 &&
    m.numbered <= 7 &&
    m.maxVisiblePeers >= 8 &&
    profile.unresolved >= 10 &&
    !profile.complete &&
    start.coverage.coupled
  );
}
function record(p, seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw Error('Invalid authoring seed');
  const full = V.certify(p);
  const {
    definitionSha256,
    nativeNodes,
    independentNodes,
    semanticSolutions,
    replayActions,
    profile,
  } = full;
  return {
    id: p.id,
    revision: p.revision,
    seed,
    opening: opening(p),
    proof: {
      definitionSha256,
      nativeNodes,
      independentNodes,
      semanticSolutions,
      replayActions,
      profile,
    },
  };
}
module.exports = { opening, eligible, record };
