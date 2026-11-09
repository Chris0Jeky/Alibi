/* Deterministic authoring tool; output is checked in, never generated in the player. */
import { solve, check, hint } from '../../src/eclipse-lab/model.mjs';
import { writeFileSync } from 'node:fs';
let seed = 9162026;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const shuffled = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sum = (a) => a.reduce((x, y) => x + y, 0);
function board(mode, n) {
  const patterns = [];
  for (let m = 0; m < 1 << n; m++) {
    let a = Array.from({ length: n }, (_, i) => (m >> i) & 1);
    if (mode !== 'harbour' && sum(a) !== n / 2) continue;
    if (
      ['constellation', 'eclipse'].includes(mode) &&
      a.some((v, i) => i >= 2 && v === a[i - 1] && v === a[i - 2])
    )
      continue;
    patterns.push(a);
  }
  for (let t = 0; t < 20000; t++) {
    const rows = Array.from({ length: n }, () => patterns[Math.floor(rand() * patterns.length)]);
    const a = rows.flat();
    let p = {
      id: 'x',
      revision: 1,
      mode,
      size: n,
      title: 'x',
      lesson: 'x',
      level: 1,
      givens: Array(n * n).fill(-1),
      links: [],
      windows: [],
      rowTargets: rows.map(sum),
      colTargets: Array.from({ length: n }, (_, c) => sum(rows.map((r) => r[c]))),
    };
    if (mode !== 'harbour' && p.colTargets.some((x) => x !== n / 2)) continue;
    if (mode === 'switchback') {
      p.rowChanges = rows.map(changes);
      p.colChanges = Array.from({ length: n }, (_, c) => changes(rows.map((r) => r[c])));
    }
    if (check(p, a).complete) return a;
  }
  throw Error('no board');
}
const changes = (a) => a.slice(1).reduce((s, v, i) => s + (v !== a[i]), 0);
function make(mode, level) {
  let n = level <= 4 ? 4 : 6,
    a = board(mode, n),
    rows = Array.from({ length: n }, (_, r) => a.slice(r * n, r * n + n)),
    cols = Array.from({ length: n }, (_, c) => rows.map((r) => r[c]));
  let p = {
    id: `${mode}-${String(level).padStart(2, '0')}`,
    revision: 1,
    mode,
    size: n,
    title: `${{ constellation: 'Constellation', eclipse: 'Eclipse', harbour: 'Harbour', switchback: 'Switchback' }[mode]} ${level}`,
    lesson: {
      constellation: 'A link joins equal or opposite symbols.',
      eclipse: 'A window counts its suns; links relate neighbouring symbols.',
      harbour: 'Line and window numbers count suns.',
      switchback: 'A change occurs wherever neighbouring symbols differ.',
    }[mode],
    level,
    givens: [...a],
    links: [],
    windows: [],
    rowTargets: rows.map(sum),
    colTargets: cols.map(sum),
  };
  if (mode === 'switchback') {
    p.rowChanges = rows.map(changes);
    p.colChanges = cols.map(changes);
  }
  if (mode === 'constellation' || mode === 'eclipse')
    for (let i = 0; i < n * n; i++)
      for (const j of [i % n < n - 1 ? i + 1 : -1, i < n * (n - 1) ? i + n : -1])
        if (j >= 0 && rand() < 0.38)
          p.links.push({ a: i, b: j, relation: a[i] === a[j] ? 'same' : 'opposite' });
  if (mode === 'eclipse' || mode === 'harbour')
    for (let r = 0; r < n - 1; r++)
      for (let c = 0; c < n - 1; c++)
        if (rand() < 0.58) {
          const i = r * n + c,
            cells = [i, i + 1, i + n, i + n + 1];
          p.windows.push({ cells, suns: sum(cells.map((j) => a[j])) });
        }
  // Remove as many fixed clues as possible while retaining a certified unique board.
  for (const i of shuffled(Array.from({ length: n * n }, (_, i) => i))) {
    let old = p.givens[i];
    p.givens[i] = -1;
    const z = solve(p);
    if (z.exhausted || z.solutions.length !== 1) p.givens[i] = old;
  }
  // Remove redundant markers individually; retaining them only when needed avoids decoration.
  for (const key of ['links', 'windows'])
    for (const clue of shuffled(p[key])) {
      let at = p[key].indexOf(clue);
      p[key].splice(at, 1);
      const z = solve(p);
      if (z.exhausted || z.solutions.length !== 1) p[key].splice(at, 0, clue);
    }
  // Add a small number of anchors where the local teaching rules get stuck.
  function progress(cells) {
    cells = [...cells];
    for (let k = 0; k < n * n; k++) {
      const h = hint(p, cells);
      if (!h) break;
      cells[h.cell] = h.value;
    }
    return cells;
  }
  for (let round = 0; round < n * n; round++) {
    let cells = progress(p.givens);
    if (cells.every((x) => x !== -1)) break;
    let best = -1,
      score = -1;
    for (let i = 0; i < cells.length; i++)
      if (cells[i] === -1) {
        const trial = [...cells];
        trial[i] = a[i];
        const result = progress(trial).filter((x) => x !== -1).length;
        if (result > score) {
          score = result;
          best = i;
        }
      }
    if (best < 0) throw Error('cannot establish local reasoning path');
    p.givens[best] = a[best];
  }
  p.solution = a;
  return p;
}
export function canonicalGrid(a, n) {
  const variants = [];
  for (let flip = 0; flip < 2; flip++)
    for (let rot = 0; rot < 4; rot++)
      for (let invert = 0; invert < 2; invert++) {
        const o = Array(n * n);
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++) {
            let y = r,
              x = flip ? n - 1 - c : c;
            for (let k = 0; k < rot; k++) [y, x] = [x, n - 1 - y];
            o[y * n + x] = a[r * n + c] ^ invert;
          }
        variants.push(o.join(''));
      }
  return variants.sort()[0];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const puzzles = [];
  for (const mode of ['constellation', 'eclipse', 'harbour', 'switchback'])
    for (let level = 1; level <= 8; level++) {
      let p,
        accepted = false;
      for (let tries = 0; tries < 100; tries++) {
        p = make(mode, level);
        if (mode === 'constellation' && !p.links.length) continue;
        if (mode === 'eclipse' && (!p.links.length || !p.windows.length)) continue;
        if (mode === 'harbour' && !p.windows.length) continue;
        if (mode !== 'switchback' && solve({ ...p, links: [], windows: [] }).solutions.length < 2)
          continue;
        if (
          puzzles.some(
            (q) =>
              q.mode === mode &&
              q.size === p.size &&
              canonicalGrid(q.solution, q.size) === canonicalGrid(p.solution, p.size),
          )
        )
          continue;
        accepted = true;
        break;
      }
      if (!accepted) throw Error(`No suitable candidate for ${mode} ${level}`);
      puzzles.push(p);
      console.log(
        p.id,
        'givens',
        p.givens.filter((x) => x !== -1).length,
        'links',
        p.links.length,
        'windows',
        p.windows.length,
      );
    }
  writeFileSync(
    'src/eclipse-lab/puzzles.mjs',
    `/* Authored, deterministic experimental levels. */\nexport const PUZZLES = ${JSON.stringify(puzzles, null, 2)};\n`,
  );
}
