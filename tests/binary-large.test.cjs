const test = require('node:test');
const assert = require('node:assert/strict');
const pack = require('../content/extra/binary-large.json');

// Independent row-enumeration oracle: no production solver or validation helpers.
function solutions(p) {
  const n = p.size;
  const valid = (line) =>
    line.reduce((a, b) => a + b, 0) === n / 2 &&
    line.every((x, i) => i < 2 || x !== line[i - 1] || x !== line[i - 2]);
  const rows = Array.from({ length: 2 ** n }, (_, bits) =>
    Array.from({ length: n }, (_, c) => (bits >> c) & 1),
  ).filter(valid);
  const choices = Array.from({ length: n }, (_, r) =>
    rows.filter((row) =>
      row.every((v, c) => p.givens[r * n + c] === -1 || p.givens[r * n + c] === v),
    ),
  );
  const found = [];
  let nodes = 0;
  function visit(grid) {
    assert.ok(++nodes < 250000, 'independent search stays bounded');
    if (found.length === 2) return;
    const r = grid.length;
    if (r === n) {
      const cols = Array.from({ length: n }, (_, c) => grid.map((row) => row[c]));
      if (cols.every(valid) && new Set(cols.map((col) => col.join(''))).size === n)
        found.push(grid.flat());
      return;
    }
    for (const row of choices[r]) {
      if (grid.some((prev) => prev.join('') === row.join(''))) continue;
      if (
        row.some((v, c) => {
          const count = grid.filter((prev) => prev[c] === v).length + 1;
          return count > n / 2 || (r >= 2 && grid[r - 1][c] === v && grid[r - 2][c] === v);
        })
      )
        continue;
      visit([...grid, row]);
    }
  }
  visit([]);
  return found;
}
for (const p of pack.puzzles)
  test(`${p.id} is a unique 8x8 board with matching published answer`, () => {
    assert.equal(p.size, 8);
    assert.equal(p.givens.length, 64);
    assert.deepEqual(solutions(p), [p.solution]);
  });
