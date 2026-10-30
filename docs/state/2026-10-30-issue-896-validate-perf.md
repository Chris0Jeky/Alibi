# Issue 896, item 1: cheaper per-save validation at startup

Branch `claude/validate-perf-896`, based on `origin/main` `64cbe3c3`. Not pushed; no PR.
Item 2 (Practise freeze) and the notes in the issue are untouched.

## Changed

Startup calls `validateRun` on every saved row, which calls `validateState` on up to 101 undo
and redo states. Puzzle-only work was repeated inside that loop.

- `src/engines.js`, aquarium `validateState`: `tankRows(p)` was evaluated once for the length check and
  again inside the `.every` callback for every level (quadratic). It is now computed once per call.
- `src/engines.js`, aquarium `validateDefinition` ("Invalid water levels."): the same call inside
  `.some` is now evaluated once, lazily, at the same point in the `||` chain.
- `src/bridges.js`, bridges `validateState`: it built the whole `graph(p)` (incident lists and the
  O(edges squared) crossing table) only to read `edges.length`. The edge scan is split out as
  `lattice(p)`, which `graph` now calls first; `validateState` uses `lattice(p).edges.length`.
  Same edges, same order, so the same length.
- No other engine's `validateState` does puzzle-only derivation: core (scene and grid types) and
  the other extras (dossier, witness, lightup, tents, network, trail) are linear in the state
  and measure 0.15 to 0.3 ms per 80-state run.

No cache or WeakMap was added: puzzle objects are mutable and never frozen, so memoizing by
object identity could return stale rows for an in-place edit. Hoisting per call cannot.
Accepted and rejected inputs, thrown messages and returned clones are unchanged.

New `tests/validate-state-equivalence.test.cjs` keeps frozen copies of the pre-change
aquarium/extras `state`, `tankRows` and bridges `graph`/`state`, and asserts equal outcomes
(returned clone or exact error text) for every official aquarium, bridges and other extras
puzzle across: the initial state, a solution-derived state, and 40 random mutations per puzzle
(wrong lengths, out-of-range values, junk types, deleted fields); then mutated puzzle
definitions (aquarium and bridges, 12 per puzzle, three states each); then a 101-state run on
one shared puzzle object. A separate case checks the definition's water-level rejection against
the old predicate (both accepted and rejected sides must occur). Mutation check: changing
`<=` to `<` in the aquarium comparison, or `!==` to `>` in the bridges length check, fails the
suite (3 and 2 of 5 tests respectively); both were reverted before committing.

## Verified

Timing is Node 24 at 1x on this Windows machine, `validateRun` (including its `C.clone`) over
synthetic runs with 80 undo states (alternating initial and solution-derived), median of 5
repetitions per run, three alternating before/after invocations. Before is `origin/main` extracted
to a scratch directory. Script: scratchpad `bench896.cjs`, not committed (throwaway).

| Set (300 runs x 80 undo states) | Before (ms)    | After (ms) |
| ------------------------------- | -------------- | ---------- |
| Mixed families, random puzzles  | 227 to 247     | 76 to 80   |
| Aquarium only                   | 3,292 to 3,367 | 385 to 413 |
| Bridges only                    | 238 to 257     | 174 to 227 |

Per run, 80 states: aquarium 10.1 to 10.7 ms -> 1.2 to 1.4 ms; bridges 0.81 to 0.86 ms -> 0.60 to
0.74 ms; every other family 0.07 to 0.34 ms, unchanged within noise. Aquarium is now within ~8x of
the other types instead of ~70x. The first mixed measurement of a process includes JIT warmup in
both columns.

- `node --test tests/validate-state-equivalence.test.cjs`: 5 pass, 0 fail.
- `npx prettier --check` on `src/engines.js`, `src/bridges.js` and the new test: clean.
- `npm run build:android`: succeeds (version 0.15.2, 570 puzzles, 311 files in the Android payload).
- `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: 2,513 tests, 2,491 pass,
  0 fail, 22 skipped.
- `tests/budget.test.cjs` passes with no ceiling change; no ceiling raise was needed,
  and the headroom was not measured. `assets-source/library/catalogue.json` needed no regeneration.
- `PYTHONUTF8=1 py -3 tests/browser_ui.py` (system Playwright, no `.venv`; the ignored
  `alibi-deluxe-play.html` bundle appeared in this worktree during the session, timestamped after the edits): 298 browser
  checks pass, no uncaught exceptions. It plays all thirteen games in an isolated page; it is not a
  hosted, real-IndexedDB or physical-device test.

## NOT verified

- Startup ready time in the built app with seeded IndexedDB, and any throttled 4x/6x CPU figure from
  the issue: not measured. The numbers above are Node 1x validation only, so a 300-save
  startup improvement in the browser is inferred, not observed.
- A physical device, Firefox and Safari.

## Residual risk

- Low. The refactor is expression-level and the equivalence test covers every official puzzle of
  the touched types plus mutated definitions; it does not enumerate all possible malformed puzzle
  definitions beyond those random mutations.
- Remaining cost: aquarium still rebuilds `tankRows` once per state (about 14 us each), and
  bridges rebuilds the edge scan once per state (about 6 us). A per-puzzle cache would remove this
  but needs an invalidation story; not done. `src/storage.js` still re-validates the stored row at
  each save, and startup still validates undo/redo histories (deferring that is a data-safety
  trade-off the issue does not propose).
- `HUMAN_TODO.md` was read; this change adds no human-action item.

## Noticed

- Practise a technique (item 2, 1.25 s long task on nonograms): tracked in #896, not started here.
