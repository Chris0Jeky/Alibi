import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PUZZLES } from '../src/eclipse-lab/puzzles.mjs';
import { validatePuzzle, check, solve } from '../src/eclipse-lab/model.mjs';
import { canonicalGrid } from '../tools/curation/eclipse-candidates.mjs';
// Independent row enumerator: builds row patterns, then checks every constraint directly.
function oracle(p) {
  const n = p.size,
    classic = ['constellation', 'eclipse'].includes(p.mode),
    rows = [];
  for (let r = 0; r < n; r++) {
    let opts = [];
    for (let m = 0; m < 2 ** n; m++) {
      let a = Array.from({ length: n }, (_, c) => (m >> c) & 1);
      if (
        a.reduce((x, y) => x + y, 0) !== p.rowTargets[r] ||
        a.some((v, c) => p.givens[r * n + c] !== -1 && p.givens[r * n + c] !== v)
      )
        continue;
      if (classic && a.some((v, c) => c > 1 && v === a[c - 1] && v === a[c - 2])) continue;
      if (
        p.mode === 'switchback' &&
        a.slice(1).filter((v, c) => v !== a[c]).length !== p.rowChanges[r]
      )
        continue;
      opts.push(a);
    }
    rows.push(opts);
  }
  let count = 0,
    first = null;
  function dfs(a, r) {
    if (count >= 2) return;
    if (r === n) {
      for (let c = 0; c < n; c++) {
        let col = Array.from({ length: n }, (_, i) => a[i * n + c]);
        if (col.reduce((x, y) => x + y, 0) !== p.colTargets[c]) return;
        if (
          p.mode === 'switchback' &&
          col.slice(1).filter((v, i) => v !== col[i]).length !== p.colChanges[c]
        )
          return;
      }
      if (classic) {
        const cols = Array.from({ length: n }, (_, c) =>
          Array.from({ length: n }, (_, r) => a[r * n + c]).join(''),
        );
        if (new Set(cols).size !== n) return;
      }
      count++;
      first ??= [...a];
      return;
    }
    for (const row of rows[r]) {
      if (
        classic &&
        Array.from({ length: r }, (_, i) => a.slice(i * n, i * n + n).join('')).includes(
          row.join(''),
        )
      )
        continue;
      let next = [...a, ...row],
        ok = true;
      for (let c = 0; c < n; c++) {
        const col = Array.from({ length: r + 1 }, (_, i) => next[i * n + c]),
          s = col.reduce((x, y) => x + y, 0);
        if (
          s > p.colTargets[c] ||
          s + n - r - 1 < p.colTargets[c] ||
          (classic && r >= 2 && col[r] === col[r - 1] && col[r] === col[r - 2])
        ) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (const l of p.links)
        if (
          l.a < next.length &&
          l.b < next.length &&
          (next[l.a] === next[l.b]) !== (l.relation === 'same')
        ) {
          ok = false;
          break;
        }
      if (!ok) continue;
      for (const w of p.windows)
        if (
          w.cells.every((i) => i < next.length) &&
          w.cells.reduce((s, i) => s + next[i], 0) !== w.suns
        ) {
          ok = false;
          break;
        }
      if (ok) dfs(next, r + 1);
    }
  }
  dfs([], 0);
  return { count, first };
}
test('all 40 authored levels validate and the original 32 remain byte-identical', () => {
  assert.equal(PUZZLES.length, 40);
  assert.equal(new Set(PUZZLES.map((p) => p.id)).size, 40);
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(PUZZLES.filter((p) => p.mode !== 'mirror')))
      .digest('hex'),
    '38a2bcbe803c3c05a3fec63ae199dc6ac5d9cb258609a710e1b8520398824b16',
  );
  for (const p of PUZZLES) {
    validatePuzzle(p);
    assert.ok(check(p, p.solution).complete, p.id);
    if (p.mode !== 'mirror') {
      const x = oracle(p);
      assert.equal(x.count, 1, p.id);
      assert.deepEqual(x.first, p.solution, p.id);
    }
    const y = solve(p);
    assert.equal(y.exhausted, false, p.id);
    assert.deepEqual(y.solutions, [p.solution], p.id);
  }
});
test('new markers and change counts materially constrain their levels', () => {
  for (const mode of ['constellation', 'eclipse', 'harbour', 'switchback']) {
    const p = PUZZLES.find((x) => x.mode === mode);
    if (mode === 'switchback') {
      const q = { ...p, mode: 'harbour', rowChanges: undefined, colChanges: undefined };
      assert.equal(oracle(q).count, 2, mode);
    } else {
      let q = { ...p, links: [], windows: [] };
      assert.equal(oracle(q).count, 2, mode);
    }
  }
});
test('curation recognizes symmetry and symbol inversion', () => {
  const a = [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
    n = 4;
  const rotate = Array.from(
    { length: 16 },
    (_, i) => a[(n - 1 - (i % n)) * n + Math.floor(i / n)] ^ 1,
  );
  assert.equal(canonicalGrid(a, n), canonicalGrid(rotate, n));
});
test('levels avoid rotated, reflected, or inverted duplicate solution grids within each mode and size', () => {
  for (const mode of ['constellation', 'eclipse', 'harbour', 'switchback'])
    for (const n of [4, 6]) {
      const subset = PUZZLES.filter((p) => p.mode === mode && p.size === n);
      assert.equal(
        new Set(subset.map((p) => canonicalGrid(p.solution, n))).size,
        subset.length,
        `${mode} ${n}`,
      );
    }
});
test('every level has an unbroken path using the advertised local reasoning hints', async () => {
  const { hint } = await import('../src/eclipse-lab/model.mjs');
  for (const p of PUZZLES) {
    const cells = [...p.givens];
    for (let i = 0; i < cells.length; i++) {
      const h = hint(p, cells);
      if (!h) break;
      assert.equal(h.value, p.solution[h.cell], p.id);
      cells[h.cell] = h.value;
    }
    assert.equal(check(p, cells).complete, true, p.id);
  }
});
