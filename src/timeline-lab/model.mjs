/* Timeline Desk: bounded, deterministic rules. Checks and hints enumerate schedules from the
   clues and the player's marks; a stored `solution` is only validated, never consulted. */
export const CLUE_TYPES = ['before', 'after', 'apart', 'within', 'not', 'witness'];
export const hourName = (h) => {
  const x = ((h % 24) + 24) % 24;
  return `${x % 12 || 12}${x < 12 ? 'am' : 'pm'}`;
};
const KEYS = [
  'id',
  'revision',
  'title',
  'story',
  'lesson',
  'payoff',
  'level',
  'start',
  'slots',
  'distinct',
  'events',
  'clues',
  'solution',
];
const SHAPES = {
  before: ['t', 'a', 'b'],
  after: ['t', 'a', 'b'],
  apart: ['t', 'a', 'b', 'k', 'mode'],
  within: ['t', 'a', 'lo', 'hi'],
  not: ['t', 'a', 's'],
  witness: ['t', 'a', 'r'],
};
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const fail = (m) => {
  throw new Error(m);
};
const plain = (o) =>
  o !== null &&
  typeof o === 'object' &&
  (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
const exact = (o, keys) =>
  plain(o) &&
  Reflect.ownKeys(o).length === keys.length &&
  keys.every(
    (k) => Object.hasOwn(o, k) && Object.hasOwn(Object.getOwnPropertyDescriptor(o, k), 'value'),
  );
export const involved = (c) => (c.b === undefined ? [c.a] : [c.a, c.b]);
export function holds(c, s) {
  switch (c.t) {
    case 'before':
      return s[c.a] < s[c.b];
    case 'after':
      return s[c.a] > s[c.b];
    case 'apart': {
      const d = Math.abs(s[c.a] - s[c.b]);
      return c.mode === 'exactly' ? d === c.k : d >= c.k;
    }
    case 'within':
      return s[c.a] >= c.lo && s[c.a] <= c.hi;
    case 'not':
      return s[c.a] !== c.s;
    default:
      return Math.abs(s[c.a] - c.r) <= 1;
  }
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const hours = (k) => `${k} hour${k === 1 ? '' : 's'}`;
export function clueText(p, c) {
  const e = (i) => p.events[i],
    h = (s) => hourName(p.start + s);
  switch (c.t) {
    case 'before':
      return `${cap(e(c.a))} before ${e(c.b)}.`;
    case 'after':
      return `${cap(e(c.a))} after ${e(c.b)}.`;
    case 'apart':
      return `${cap(e(c.a))} and ${e(c.b)}: ${c.mode === 'exactly' ? 'exactly' : 'at least'} ${hours(c.k)} apart.`;
    case 'within':
      return `${cap(e(c.a))} between ${h(c.lo)} and ${h(c.hi)}, both hours included.`;
    case 'not':
      return `Not at ${h(c.s)}: ${e(c.a)}.`;
    default:
      return `A witness clock reads ${h(c.r)} when ${e(c.a)}, give or take an hour.`;
  }
}
export function validatePuzzle(p) {
  if (!exact(p, KEYS)) fail('Invalid timeline puzzle.');
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id)) fail('Invalid timeline identity.');
  if (!int(p.revision, 1, 1e6) || !int(p.level, 1, 99)) fail('Invalid timeline revision.');
  if (!str(p.title, 80) || !str(p.story, 300) || !str(p.lesson, 200) || !str(p.payoff, 200))
    fail('Invalid timeline text.');
  if (!int(p.start, 0, 23) || !int(p.slots, 5, 8) || typeof p.distinct !== 'boolean')
    fail('Invalid timeline hours.');
  const n = Array.isArray(p.events) ? p.events.length : 0,
    T = p.slots;
  if (!int(n, 4, 6) || !p.events.every((x) => str(x, 60)))
    fail('A timeline has four to six events.');
  if (!Array.isArray(p.clues) || !int(p.clues.length, 1, 14)) fail('Invalid timeline clues.');
  for (const c of p.clues) {
    if (!plain(c) || !Object.hasOwn(SHAPES, c.t) || !exact(c, SHAPES[c.t]))
      fail('Invalid timeline clue.');
    const ok =
      int(c.a, 0, n - 1) &&
      (c.b === undefined || (int(c.b, 0, n - 1) && c.b !== c.a)) &&
      (c.k === undefined || (int(c.k, 1, T - 1) && ['exactly', 'atleast'].includes(c.mode))) &&
      (c.t !== 'within' ||
        (int(c.lo, 0, T - 1) && int(c.hi, 0, T - 1) && c.lo < c.hi && c.hi - c.lo < T - 1)) &&
      (c.t !== 'not' || int(c.s, 0, T - 1)) &&
      (c.t !== 'witness' || int(c.r, 0, T - 1));
    if (!ok) fail('Invalid timeline clue.');
  }
  const s = p.solution;
  if (!Array.isArray(s) || s.length !== n || !s.every((v) => int(v, 0, T - 1)))
    fail('Invalid timeline schedule.');
  if (!p.clues.every((c) => holds(c, s)) || (p.distinct && new Set(s).size !== n))
    fail('The stored schedule breaks a clue.');
  return p;
}
export const emptyMarks = (p) => Array(p.events.length * p.slots).fill(0);
// Cell value: 0 open, 1 ruled out, 2 placed. A row holds at most one placement.
export function applyMark(p, marks, cell, value) {
  const T = p.slots,
    row = Math.floor(cell / T),
    next = marks.slice(),
    v = value ?? (marks[cell] + 1) % 3;
  next[cell] = v;
  if (v === 2)
    for (let s = 0; s < T; s++)
      if (row * T + s !== cell && next[row * T + s] === 2) next[row * T + s] = 0;
  return next;
}
export function placements(p, marks) {
  const T = p.slots;
  return p.events.map((_, e) => {
    for (let s = 0; s < T; s++) if (marks[e * T + s] === 2) return s;
    return -1;
  });
}
// Hours still open for each event: a placed cell fixes the event, ruled-out cells are excluded.
function domains(p, marks) {
  const T = p.slots,
    all = Array.from({ length: T }, (_, s) => s);
  return p.events.map((_, e) => {
    if (!marks) return all;
    const placed = all.filter((s) => marks[e * T + s] === 2);
    return placed.length > 1
      ? []
      : placed.length
        ? placed
        : all.filter((s) => marks[e * T + s] !== 1);
  });
}
// Every schedule that satisfies the clues, the shared-hour rule and the given marks.
// Plain depth-first enumeration; clues are tested as soon as their last event is assigned.
export function schedules(p, marks = null, limit = Infinity) {
  const n = p.events.length,
    domain = domains(p, marks);
  const byLast = Array.from({ length: n }, () => []);
  for (const c of p.clues) byLast[Math.max(...involved(c))].push(c);
  const out = [],
    cur = Array(n);
  (function go(e) {
    if (e === n) return void out.push(cur.slice());
    for (const s of domain[e]) {
      if (out.length >= limit) return;
      cur[e] = s;
      if (p.distinct && cur.slice(0, e).includes(s)) continue;
      if (byLast[e].every((c) => holds(c, cur))) go(e + 1);
    }
  })(0);
  return out;
}
export const solve = (p) => schedules(p);
export function check(p, marks) {
  const placed = placements(p, marks),
    issues = [];
  p.clues.forEach((c, i) => {
    if (involved(c).every((e) => placed[e] >= 0) && !holds(c, placed))
      issues.push({ clue: i, events: involved(c), text: `Check this clue: ${clueText(p, c)}` });
  });
  if (p.distinct)
    for (let a = 0; a < placed.length; a++)
      for (let b = a + 1; b < placed.length; b++)
        if (placed[a] >= 0 && placed[a] === placed[b])
          issues.push({
            clue: -1,
            events: [a, b],
            text: `${cap(p.events[a])} and ${p.events[b]} cannot share an hour in this case.`,
          });
  return { placed, issues, complete: placed.every((s) => s >= 0) && !issues.length };
}
// Can event e take hour v under clue c, given the hours still open for the other event?
function supported(p, dom, c, e, v) {
  const o = involved(c).find((x) => x !== e),
    s = [];
  s[e] = v;
  if (o === undefined) return holds(c, s);
  return dom[o].some((w) => {
    s[o] = w;
    return holds(c, s) && !(p.distinct && w === v);
  });
}
// Hints name a cell that is certain given the clues and the current marks, never one read from
// a stored answer. They prefer a cell one clue (or the shared-hour rule) explains; when the
// player has used those up, they fall back to full enumeration of the consistent schedules.
export function hint(p, marks) {
  const T = p.slots,
    N = p.events.length,
    name = (e) => `“${p.events[e]}”`,
    hr = (s) => hourName(p.start + s);
  if (check(p, marks).complete)
    return { kind: 'solved', cells: [], text: 'This schedule already fits every clue.' };
  const found = schedules(p, marks);
  if (!found.length) {
    const marked = marks.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    const culprits = marked.filter((i) => {
      const m = marks.slice();
      m[i] = 0;
      return schedules(p, m, 1).length > 0;
    });
    return {
      kind: 'contradiction',
      cells: culprits.length ? culprits : marked,
      text: culprits.length
        ? 'No schedule fits every clue and your marks. Clearing any one outlined mark would fix that.'
        : 'No schedule fits every clue and your marks together. Several outlined marks conflict; try Undo.',
    };
  }
  const dom = domains(p, marks),
    open = (e, s) => marks[e * T + s] === 0;
  for (let e = 0; e < N; e++)
    if (dom[e].length === 1 && marks[e * T + dom[e][0]] !== 2)
      return {
        kind: 'place',
        cells: [e * T + dom[e][0]],
        text: `Every other hour is ruled out for ${name(e)}. Place it at ${hr(dom[e][0])}.`,
      };
  for (const [i, c] of p.clues.entries())
    for (const e of involved(c))
      for (const s of dom[e])
        if (open(e, s) && !supported(p, dom, c, e, s))
          return {
            kind: 'rule-out',
            cells: [e * T + s],
            text: `Clue ${i + 1} (${clueText(p, c)}) leaves no room for ${name(e)} at ${hr(s)} given your marks. Rule it out.`,
          };
  if (p.distinct)
    for (let e = 0; e < N; e++)
      for (const s of dom[e]) {
        const o = dom.findIndex((d, x) => x !== e && d.length === 1 && d[0] === s);
        if (open(e, s) && o >= 0)
          return {
            kind: 'rule-out',
            cells: [e * T + s],
            text: `${name(o)} is already fixed at ${hr(s)} and no two events share an hour, so ${name(e)} cannot be there. Rule it out.`,
          };
      }
  const possible = p.events.map((_, e) => new Set(found.map((x) => x[e])));
  for (let e = 0; e < N; e++)
    for (let s = 0; s < T; s++)
      if (!possible[e].has(s) && open(e, s))
        return {
          kind: 'rule-out',
          cells: [e * T + s],
          text: `Combining several clues: no schedule that fits your marks has ${name(e)} at ${hr(s)}. Rule it out.`,
        };
  for (let e = 0; e < N; e++) {
    const s = [...possible[e]][0];
    if (possible[e].size === 1 && marks[e * T + s] !== 2)
      return {
        kind: 'place',
        cells: [e * T + s],
        text: `Combining several clues: every schedule that fits your marks has ${name(e)} at ${hr(s)}. Place it.`,
      };
  }
  return {
    kind: 'none',
    cells: [],
    text: 'Nothing is certain yet. Try ruling out an hour a clue can defend, then ask again.',
  };
}
