// Authoring helper for Timeline Desk. Given a hand-written story, schedule and clue-type mix it
// finds a minimal clue set with exactly one solution. The committed levels in
// src/timeline-lab/puzzles.mjs are this script's output for tools/curation/timeline-specs.mjs.
import { pathToFileURL } from 'node:url';
import { schedules, holds, involved, validatePuzzle } from '../../src/timeline-lab/model.mjs';

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Every clue that is true of the schedule, for the allowed clue types.
export function pool(spec) {
  const s = spec.solution,
    T = spec.slots,
    n = s.length,
    out = [];
  const allowed = (t) => spec.allow[t] > 0;
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a === b) continue;
      if (s[a] < s[b]) {
        if (allowed('before')) out.push({ t: 'before', a, b });
        if (allowed('after')) out.push({ t: 'after', a: b, b: a });
      }
      if (a < b && allowed('apart')) {
        const d = Math.abs(s[a] - s[b]);
        if (d >= 1) out.push({ t: 'apart', a, b, k: d, mode: 'exactly' });
        for (let k = spec.distinct ? 2 : 1; k <= d; k++)
          out.push({ t: 'apart', a, b, k, mode: 'atleast' });
      }
    }
    if (allowed('within'))
      for (let lo = Math.max(0, s[a] - 3); lo <= s[a]; lo++)
        for (let hi = s[a]; hi <= Math.min(T - 1, lo + 3); hi++)
          if (lo < hi && hi - lo < T - 1) out.push({ t: 'within', a, lo, hi });
    if (allowed('not')) for (let x = 0; x < T; x++) if (x !== s[a]) out.push({ t: 'not', a, s: x });
    if (allowed('witness'))
      for (let r = s[a] - 1; r <= s[a] + 1; r++)
        if (r >= 0 && r < T) out.push({ t: 'witness', a, r });
  }
  return out;
}
const base = (spec, clues) => ({
  id: spec.id,
  revision: 1,
  title: spec.title,
  story: spec.story,
  lesson: spec.lesson,
  payoff: spec.payoff,
  level: spec.level,
  start: spec.start,
  slots: spec.slots,
  distinct: spec.distinct,
  events: spec.events,
  clues,
  solution: spec.solution,
});
// Difficulty proxy: arc-consistency plus single-value elimination. `solved` means no
// what-if reasoning is needed; `left` counts the candidate hours still open when it stalls.
export function propagate(p) {
  const n = p.events.length,
    dom = p.events.map(() => new Set(Array.from({ length: p.slots }, (_, i) => i)));
  for (let changed = true; changed;) {
    changed = false;
    for (const c of p.clues)
      for (const e of involved(c)) {
        const others = involved(c).filter((x) => x !== e);
        for (const v of [...dom[e]]) {
          const supported = (i, s) =>
            i === others.length
              ? holds(c, s) && !(p.distinct && others.some((o) => s[o] === v))
              : [...dom[others[i]]].some((w) =>
                  supported(i + 1, Object.assign(s.slice(), { [others[i]]: w })),
                );
          if (!supported(0, Object.assign([], { [e]: v }))) {
            dom[e].delete(v);
            changed = true;
          }
        }
      }
    if (p.distinct)
      for (let e = 0; e < n; e++)
        if (dom[e].size === 1)
          for (let o = 0; o < n; o++) if (o !== e && dom[o].delete([...dom[e]][0])) changed = true;
  }
  const left = dom.reduce((a, d) => a + d.size - 1, 0);
  return { solved: left === 0, left };
}
const unique = (spec, clues) => schedules(base(spec, clues), null, 2).length === 1;
export function attempt(spec, seed) {
  const rand = rng(seed),
    all = pool(spec).filter((c) => holds(c, spec.solution));
  // Weighted shuffle: higher weight tends to come earlier.
  const order = all
    .map((c) => ({ c, k: Math.pow(rand(), 1 / spec.allow[c.t]) }))
    .sort((x, y) => y.k - x.k)
    .map((x) => x.c);
  let chosen = [];
  for (const c of order) {
    chosen.push(c);
    if (unique(spec, chosen)) break;
  }
  if (!unique(spec, chosen)) return null;
  for (const c of [...chosen].sort(() => rand() - 0.5)) {
    const rest = chosen.filter((x) => x !== c);
    if (rest.length && unique(spec, rest)) chosen = rest;
  }
  return chosen;
}
export function build(spec) {
  const seeds = spec.seed ? [spec.seed] : Array.from({ length: 4000 }, (_, i) => i + 1);
  for (const seed of seeds) {
    const clues = attempt(spec, seed);
    if (!clues) continue;
    const types = new Set(clues.map((c) => c.t));
    if (clues.length < spec.count[0] || clues.length > spec.count[1]) continue;
    if (!(spec.require || []).every((t) => types.has(t))) continue;
    if (!(spec.forbid || []).every((t) => !types.has(t))) continue;
    if (spec.minTypes && types.size < spec.minTypes) continue;
    const draft = validatePuzzle(base(spec, clues));
    if (spec.search !== undefined && propagate(draft).solved === spec.search) continue;
    clues.sort((x, y) => x.a - y.a || x.t.localeCompare(y.t) || (x.b ?? 0) - (y.b ?? 0));
    return { seed, puzzle: draft };
  }
  throw new Error(`No candidate for ${spec.id}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { SPECS } = await import('./timeline-specs.mjs');
  const only = process.argv[2];
  const fields = {
    before: ['a', 'b'],
    after: ['a', 'b'],
    apart: ['a', 'b', 'k', 'mode'],
    within: ['a', 'lo', 'hi'],
    not: ['a', 's'],
    witness: ['a', 'r'],
  };
  const constructors = Object.entries(fields).map(
    ([t, args]) => `const ${t} = (${args.join(', ')}) => ({ t: '${t}', ${args.join(', ')} });`,
  );
  const built = SPECS.filter((s) => !only || s.id === only).map((s) => {
    const r = build(s);
    console.error(`${s.id}: seed ${r.seed}, ${r.puzzle.clues.length} clues`);
    const { clues, solution, ...metadata } = r.puzzle;
    const properties = Object.entries(metadata).map(
      ([key, value]) => `    ${key}: ${JSON.stringify(value)},`,
    );
    const calls = clues.map(
      (c) => `      ${c.t}(${fields[c.t].map((key) => JSON.stringify(c[key])).join(', ')}),`,
    );
    return [
      '  {',
      ...properties,
      '    clues: [',
      ...calls,
      '    ],',
      `    solution: ${JSON.stringify(solution)},`,
      '  },',
    ].join('\n');
  });
  console.log(
    [
      '/* Authored, deterministic experimental levels. Regenerate with tools/curation/timeline-candidates.mjs. */',
      ...constructors,
      '',
      'export const PUZZLES = [',
      ...built,
      '];',
    ].join('\n'),
  );
}
