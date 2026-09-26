'use strict';
// Independent forward BFS, counting pushes, not player footsteps. No game solver calls.
const assert = require('node:assert/strict');
function solve(map, limit = 200000) {
  const w = map[0].length,
    h = map.length,
    flat = map.join('');
  const floor = new Set([...flat].flatMap((v, i) => (v === '#' ? [] : [i])));
  const goals = new Set([...flat].flatMap((v, i) => ('.+*'.includes(v) ? [i] : [])));
  const boxes = [...flat].flatMap((v, i) => ('$*'.includes(v) ? [i] : []));
  const player = [...flat].findIndex((v) => '@+'.includes(v));
  assert.ok(player >= 0 && goals.size === boxes.length);
  function step(cell, d) {
    const other = cell + [-w, 1, w, -1][d];
    return other >= 0 &&
      other < w * h &&
      Math.abs((other % w) - (cell % w)) +
        Math.abs(Math.floor(other / w) - Math.floor(cell / w)) ===
        1 &&
      floor.has(other)
      ? other
      : -1;
  }
  function region(p, blocked) {
    const cells = [p],
      seen = new Set(cells);
    for (let i = 0; i < cells.length; i++)
      for (let d = 0; d < 4; d++) {
        const q = step(cells[i], d);
        if (q >= 0 && !blocked.has(q) && !seen.has(q)) {
          seen.add(q);
          cells.push(q);
        }
      }
    return seen;
  }
  // A crate square is safe only if a lone crate can be pulled back from some goal.
  // This discards only static impossibilities, never a speculative multi-crate deadlock.
  const safe = new Set(goals),
    pending = [...goals];
  for (let i = 0; i < pending.length; i++)
    for (let d = 0; d < 4; d++) {
      const previous = step(pending[i], d),
        standing = previous < 0 ? -1 : step(previous, d);
      if (standing >= 0 && !safe.has(previous)) {
        safe.add(previous);
        pending.push(previous);
      }
    }
  const firstRegion = region(player, new Set(boxes));
  const key = (b, r) => b.join(',') + ':' + Math.min(...r);
  const queue = [{ b: boxes, r: firstRegion, cost: 0 }],
    seen = new Set([key(boxes, firstRegion)]);
  for (let head = 0; head < queue.length; head++) {
    const { b, r, cost } = queue[head];
    if (b.every((x) => goals.has(x)))
      return { minimumPushes: cost, visited: seen.size, exhausted: false };
    for (let i = 0; i < b.length; i++)
      for (let d = 0; d < 4; d++) {
        const dest = step(b[i], d),
          support = step(b[i], (d + 2) % 4);
        if (dest < 0 || !safe.has(dest) || !r.has(support) || b.includes(dest)) continue;
        const next = b.map((x, j) => (j === i ? dest : x)).sort((a, b) => a - b);
        const nextRegion = region(b[i], new Set(next)),
          id = key(next, nextRegion);
        if (seen.has(id)) continue;
        if (seen.size >= limit) return { minimumPushes: null, visited: seen.size, exhausted: true };
        seen.add(id);
        queue.push({ b: next, r: nextRegion, cost: cost + 1 });
      }
  }
  return { minimumPushes: null, visited: seen.size, exhausted: false };
}
module.exports = { solve };
