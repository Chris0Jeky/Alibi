/* Eclipse Lab: bounded, deterministic rules. Stored solutions are never consulted. */
export const MODES = {
  constellation: {
    title: 'Constellation',
    description: 'Follow links across a balanced sky.',
    rules: [
      'Each row and column has equal suns and moons.',
      'No three matching symbols touch in a row or column.',
      'Rows must differ from other rows, and columns from other columns.',
      'Linked cells are the same or opposite as marked.',
    ],
  },
  eclipse: {
    title: 'Eclipse',
    description: 'Combine linked cells with small sun-count windows.',
    rules: [
      'Each row and column has equal suns and moons.',
      'No three matching symbols touch in a row or column.',
      'Rows must differ from other rows, and columns from other columns.',
      'Links mark matching or opposite cells.',
      'Each window contains its shown number of suns.',
    ],
  },
  harbour: {
    title: 'Harbour',
    description: 'Use crossing counts to reveal the lights.',
    rules: [
      'Each row and column contains its shown number of suns.',
      'Each window contains its shown number of suns.',
    ],
  },
  switchback: {
    title: 'Switchback',
    description: 'Count the changes along each line.',
    rules: [
      'Each row and column has equal suns and moons.',
      'Each line has the shown number of changes between neighbouring symbols.',
    ],
  },
};
const integer = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
const list = (a, n, lo, hi) =>
  Array.isArray(a) && a.length === n && Array.from(a).every((x) => integer(x, lo, hi));
const classic = (p) => p.mode === 'constellation' || p.mode === 'eclipse';
function fail(s) {
  throw new Error(s);
}
const plain = (o) =>
  o !== null &&
  typeof o === 'object' &&
  (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
const only = (o, keys) =>
  Reflect.ownKeys(o).every((k) => typeof k === 'string' && keys.includes(k));
const ownData = (o, k) =>
  Object.hasOwn(o, k) && Object.hasOwn(Object.getOwnPropertyDescriptor(o, k), 'value');
function validate(p, withSolution) {
  if (
    !plain(p) ||
    !only(p, [
      'id',
      'revision',
      'mode',
      'size',
      'title',
      'lesson',
      'level',
      'givens',
      'links',
      'windows',
      'rowTargets',
      'colTargets',
      'rowChanges',
      'colChanges',
      'solution',
    ]) ||
    ![
      'id',
      'revision',
      'mode',
      'size',
      'title',
      'lesson',
      'level',
      'givens',
      'links',
      'windows',
      'rowTargets',
      'colTargets',
    ].every((k) => ownData(p, k)) ||
    !Object.hasOwn(MODES, p.mode) ||
    ![4, 6].includes(p.size)
  )
    fail('Invalid puzzle mode or size.');
  const n = p.size,
    N = n * n;
  if (
    typeof p.id !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id) ||
    p.revision !== 1 ||
    typeof p.title !== 'string' ||
    p.title.length > 100 ||
    typeof p.lesson !== 'string' ||
    p.lesson.length > 600 ||
    !integer(p.level, 1, 1000) ||
    !list(p.givens, N, -1, 1) ||
    !list(p.rowTargets, n, 0, n) ||
    !list(p.colTargets, n, 0, n)
  )
    fail('Invalid puzzle fields.');
  if (p.mode !== 'harbour' && [...p.rowTargets, ...p.colTargets].some((x) => x !== n / 2))
    fail('Lines must be balanced.');
  if (
    !Array.isArray(p.links) ||
    p.links.length > 2 * n * (n - 1) ||
    !Array.isArray(p.windows) ||
    p.windows.length > (n - 1) ** 2
  )
    fail('Invalid clues.');
  if (!['constellation', 'eclipse'].includes(p.mode) && p.links.length)
    fail('Links are not used in this mode.');
  if (!['eclipse', 'harbour'].includes(p.mode) && p.windows.length)
    fail('Windows are not used in this mode.');
  const edges = new Set();
  for (const l of p.links) {
    if (
      !plain(l) ||
      !only(l, ['a', 'b', 'relation']) ||
      !['a', 'b', 'relation'].every((k) => ownData(l, k)) ||
      !integer(l.a, 0, N - 1) ||
      !integer(l.b, 0, N - 1) ||
      !['same', 'opposite'].includes(l.relation) ||
      !(
        Math.abs(l.a - l.b) === n ||
        (Math.abs(l.a - l.b) === 1 && Math.floor(l.a / n) === Math.floor(l.b / n))
      )
    )
      fail('Invalid link.');
    const key = [l.a, l.b].sort((a, b) => a - b).join(':');
    if (edges.has(key)) fail('Duplicate link.');
    edges.add(key);
  }
  const windows = new Set();
  for (const w of p.windows) {
    if (
      !plain(w) ||
      !only(w, ['cells', 'suns']) ||
      !['cells', 'suns'].every((k) => ownData(w, k)) ||
      !Array.isArray(w.cells) ||
      w.cells.length !== 4 ||
      !w.cells.every((x) => integer(x, 0, N - 1)) ||
      !integer(w.suns, 0, 4)
    )
      fail('Invalid window.');
    const a = [...w.cells].sort((x, y) => x - y),
      s = a[0];
    if (s % n === n - 1 || s >= N - n || a.join(',') !== [s, s + 1, s + n, s + n + 1].join(','))
      fail('Window must be a 2×2 square.');
    if (windows.has(s)) fail('Duplicate window.');
    windows.add(s);
  }
  if (
    withSolution &&
    Object.hasOwn(p, 'solution') &&
    (!ownData(p, 'solution') ||
      !list(Object.getOwnPropertyDescriptor(p, 'solution').value, N, 0, 1))
  )
    fail('Invalid solution shape.');
  if (
    p.mode === 'switchback' &&
    (!ownData(p, 'rowChanges') ||
      !ownData(p, 'colChanges') ||
      !list(p.rowChanges, n, 0, n - 1) ||
      !list(p.colChanges, n, 0, n - 1))
  )
    fail('Invalid switch counts.');
  return p;
}
export function validatePuzzle(p) {
  return validate(p, true);
}
function state(p, cells) {
  validate(p, false);
  if (!list(cells, p.size * p.size, -1, 1)) fail('Invalid board state.');
}
const lineIndices = (n, k, col) =>
  Array.from({ length: n }, (_, i) => (col ? i * n + k : k * n + i));
function options(p, cells, idx, target, changes) {
  const n = idx.length,
    out = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const a = idx.map((_, i) => (mask >> i) & 1);
    if (
      a.reduce((x, y) => x + y, 0) !== target ||
      a.some((x, i) => cells[idx[i]] !== -1 && cells[idx[i]] !== x)
    )
      continue;
    if (classic(p) && a.some((x, i) => i >= 2 && x === a[i - 1] && x === a[i - 2])) continue;
    if (p.mode === 'switchback' && a.slice(1).reduce((s, x, i) => s + (x !== a[i]), 0) !== changes)
      continue;
    out.push(a);
  }
  return out;
}
function inspect(p, cells) {
  const n = p.size,
    issues = [],
    lines = [[], []];
  const add = (message, c) => issues.push({ message, cells: c });
  for (let i = 0; i < cells.length; i++)
    if (p.givens[i] !== -1 && cells[i] !== p.givens[i]) add('A fixed cell has changed.', [i]);
  for (const [col, targets, changes] of [
    [false, p.rowTargets, p.rowChanges],
    [true, p.colTargets, p.colChanges],
  ])
    for (let k = 0; k < n; k++) {
      const idx = lineIndices(n, k, col),
        opts = options(p, cells, idx, targets[k], changes?.[k]);
      lines[+col].push({ idx, opts });
      if (!opts.length) add(`${col ? 'Column' : 'Row'} ${k + 1} cannot meet its rules.`, idx);
    }
  if (classic(p))
    for (const group of lines)
      for (let a = 0; a < n; a++)
        for (let b = 0; b < a; b++) {
          const x = group[a].idx,
            y = group[b].idx;
          if (x.every((i) => cells[i] !== -1) && x.every((i, j) => cells[i] === cells[y[j]]))
            add('Completed lines must be different.', [...y, ...x]);
        }
  for (const l of p.links) {
    const a = cells[l.a],
      b = cells[l.b];
    if (a !== -1 && b !== -1 && (a === b) !== (l.relation === 'same'))
      add('This link is not satisfied.', [l.a, l.b]);
  }
  for (const w of p.windows) {
    const v = w.cells.map((i) => cells[i]),
      sum = v.filter((x) => x === 1).length,
      empty = v.filter((x) => x === -1).length;
    if (sum > w.suns || sum + empty < w.suns)
      add('This window cannot meet its sun count.', w.cells);
  }
  return { issues, lines };
}
export function check(p, cells) {
  state(p, cells);
  const { issues } = inspect(p, cells);
  return { issues, complete: issues.length === 0 && cells.every((x) => x !== -1) };
}
export function component(p, cell) {
  validate(p, false);
  if (!integer(cell, 0, p.size * p.size - 1)) fail('Invalid cell.');
  const seen = new Map([[cell, 0]]),
    queue = [cell];
  for (let q = 0; q < queue.length; q++) {
    const a = queue[q];
    for (const l of p.links) {
      if (l.a !== a && l.b !== a) continue;
      const b = l.a === a ? l.b : l.a,
        parity = seen.get(a) ^ (l.relation === 'opposite' ? 1 : 0);
      if (seen.has(b)) {
        if (seen.get(b) !== parity) fail('Contradictory link component.');
      } else {
        seen.set(b, parity);
        queue.push(b);
      }
    }
  }
  return [...seen].map(([cell, parity]) => ({ cell, parity })).sort((a, b) => a.cell - b.cell);
}
export function applyMark(p, cells, action) {
  state(p, cells);
  if (p.givens.some((v, i) => v !== -1 && cells[i] !== v))
    return { ok: false, cells: [...cells], message: 'A fixed cell has changed.' };
  if (
    !action ||
    !integer(action.cell, 0, cells.length - 1) ||
    !integer(action.value, -1, 1) ||
    typeof action.linked !== 'boolean'
  )
    return { ok: false, cells: [...cells], message: 'Invalid action.' };
  let group;
  try {
    group = action.linked ? component(p, action.cell) : [{ cell: action.cell, parity: 0 }];
  } catch {
    return { ok: false, cells: [...cells], message: 'These links contradict one another.' };
  }
  const out = [...cells];
  for (const x of group) {
    const v = action.value === -1 ? -1 : action.value ^ x.parity;
    if (p.givens[x.cell] !== -1 && p.givens[x.cell] !== v)
      return { ok: false, cells: [...cells], message: 'A linked fixed cell would change.' };
  }
  for (const x of group) out[x.cell] = action.value === -1 ? -1 : action.value ^ x.parity;
  return { ok: true, cells: out, message: '' };
}
export function solve(p, cells = p.givens, optionsArg = {}) {
  state(p, cells);
  const maxNodes = optionsArg?.maxNodes ?? 50000;
  if (!integer(maxNodes, 1, 50000)) fail('Invalid solver budget.');
  const solutions = [];
  let nodes = 0,
    exhausted = false;
  function visit(a) {
    if (solutions.length >= 2 || exhausted) return;
    if (nodes >= maxNodes) {
      exhausted = true;
      return;
    }
    nodes++;
    const { issues, lines } = inspect(p, a);
    if (issues.length) return;
    let best = -1,
      bestMask = 3;
    for (let i = 0; i < a.length; i++)
      if (a[i] === -1) {
        let mask = 3;
        for (const group of lines) {
          const line = group.find((l) => l.idx.includes(i)),
            at = line.idx.indexOf(i);
          let m = 0;
          for (const o of line.opts) m |= 1 << o[at];
          mask &= m;
        }
        if (!mask) return;
        if (best < 0 || mask !== 3) {
          best = i;
          bestMask = mask;
          if (mask !== 3) break;
        }
      }
    if (best < 0) {
      solutions.push([...a]);
      return;
    }
    for (let v = 0; v < 2; v++)
      if (bestMask & (1 << v)) {
        a[best] = v;
        visit(a);
        a[best] = -1;
        if (exhausted || solutions.length >= 2) break;
      }
  }
  visit([...cells]);
  return { solutions, nodes, exhausted };
}
export function hint(p, cells) {
  state(p, cells);
  const { issues, lines } = inspect(p, cells);
  if (issues.length) return null;
  for (const l of p.links) {
    const a = cells[l.a],
      b = cells[l.b],
      flip = l.relation === 'opposite' ? 1 : 0;
    if (a !== -1 && b === -1)
      return {
        cell: l.b,
        value: a ^ flip,
        reason: 'The link fixes this cell relative to its neighbour.',
      };
    if (b !== -1 && a === -1)
      return {
        cell: l.a,
        value: b ^ flip,
        reason: 'The link fixes this cell relative to its neighbour.',
      };
  }
  if (classic(p))
    for (const group of lines)
      for (const { idx } of group)
        for (let j = 0; j < idx.length - 2; j++) {
          const a = idx.slice(j, j + 3),
            v = a.map((i) => cells[i]);
          for (let k = 0; k < 3; k++)
            if (v[k] === -1 && v[(k + 1) % 3] !== -1 && v[(k + 1) % 3] === v[(k + 2) % 3])
              return {
                cell: a[k],
                value: 1 - v[(k + 1) % 3],
                reason: 'This line cannot contain three consecutive matching symbols.',
              };
        }
  for (const w of p.windows) {
    const filled = w.cells.filter((i) => cells[i] === 1).length,
      empty = w.cells.filter((i) => cells[i] === -1);
    if (empty.length && (filled === w.suns || filled + empty.length === w.suns))
      return {
        cell: empty[0],
        value: filled === w.suns ? 0 : 1,
        reason: 'The window sun count fixes the remaining cells.',
      };
  }
  for (const group of lines)
    for (const { idx, opts } of group)
      for (let j = 0; j < idx.length; j++)
        if (cells[idx[j]] === -1 && opts.length && opts.every((o) => o[j] === opts[0][j]))
          return {
            cell: idx[j],
            value: opts[0][j],
            reason: 'Every allowed pattern for this line has the same symbol here.',
          };
  return null;
}
