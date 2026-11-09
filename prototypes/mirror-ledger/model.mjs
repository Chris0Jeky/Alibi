// Exact finite enumeration: at most 6^4 row combinations per board.
const patterns = [3, 5, 6, 9, 10, 12].map((n) => Array.from({ length: 4 }, (_, i) => (n >> i) & 1));
const allBoards = [];
for (const a of patterns)
  for (const b of patterns)
    for (const c of patterns)
      for (const d of patterns) {
        const rows = [a, b, c, d];
        const cols = Array.from({ length: 4 }, (_, i) => rows.map((r) => r[i]));
        const validLine = (l) =>
          l.reduce((x, y) => x + y, 0) === 2 &&
          !(l[0] === l[1] && l[1] === l[2]) &&
          !(l[1] === l[2] && l[2] === l[3]);
        if (
          rows.every(validLine) &&
          cols.every(validLine) &&
          new Set(rows.map((r) => r.join(''))).size === 4 &&
          new Set(cols.map((r) => r.join(''))).size === 4
        )
          allBoards.push(rows.flat());
      }
function valid(p, cells) {
  return (
    p &&
    Array.isArray(p.givens) &&
    p.givens.length === 2 &&
    Array.isArray(cells) &&
    cells.length === 2 &&
    [0, 1].every((b) => {
      const g = p.givens[b];
      return (
        Array.isArray(g) &&
        g.length === 16 &&
        Array.isArray(cells[b]) &&
        cells[b].length === 16 &&
        Array.from(g).every(
          (v, i) =>
            [-1, 0, 1].includes(v) &&
            [-1, 0, 1].includes(cells[b][i]) &&
            (v === -1 || v === cells[b][i]),
        )
      );
    }) &&
    Array.isArray(p.links) &&
    p.links.length <= 16 &&
    Array.from(p.links).every(
      (l) =>
        l &&
        Number.isInteger(l.a) &&
        l.a >= 0 &&
        l.a < 16 &&
        Number.isInteger(l.b) &&
        l.b >= 0 &&
        l.b < 16 &&
        ['same', 'opposite'].includes(l.relation),
    )
  );
}
export function solve(p, cells = p?.givens) {
  if (!valid(p, cells)) return { solutions: [], invalid: true };
  const candidates = cells.map((c) =>
    allBoards.filter((b) => b.every((v, i) => c[i] === -1 || c[i] === v)),
  );
  const solutions = [];
  for (const a of candidates[0])
    for (const b of candidates[1])
      if (p.links.every((l) => (a[l.a] === b[l.b]) === (l.relation === 'same')))
        solutions.push([a.slice(), b.slice()]);
  return { solutions, invalid: false };
}
export function check(p, cells = p?.givens) {
  const result = solve(p, cells);
  return {
    invalid: result.invalid,
    possible: result.solutions.length > 0,
    complete:
      !result.invalid &&
      cells.every((b) => b.every((v) => v !== -1)) &&
      result.solutions.length === 1,
  };
}
export function hint(p, cells = p?.givens) {
  const { solutions } = solve(p, cells);
  if (!solutions.length) return null;
  for (let b = 0; b < 2; b++)
    for (let i = 0; i < 16; i++)
      if (cells[b][i] === -1 && solutions.every((s) => s[b][i] === solutions[0][b][i]))
        return {
          board: b,
          index: i,
          value: solutions[0][b][i],
          reason:
            'Every completion consistent with both boards and the links has this symbol here.',
        };
  return null;
}
