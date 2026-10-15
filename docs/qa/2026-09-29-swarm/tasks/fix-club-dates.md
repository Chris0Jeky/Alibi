# fix-club-dates: reject non-string Club run dates, harden house comparator

## Reproduction
1. Craft a Club save (`schema: 1`) whose `runs.duel` and `runs.borough` each
   have a non-empty valid `log` and a numeric `updatedAt` (e.g. `123`).
2. `validateSave` in `src/backup-validation.js` accepts it: the per-run checks
   (lines 123-181) never inspect `r.updatedAt`, unlike the puzzle-run date
   check at lines 51-58.
3. Open the house home surface: `gameRuns` (`src/house/model.js:125`) keeps the
   number (`123 || ''` is `123`), and `nextActivity` (`src/house/model.js:134`)
   calls `b.updatedAt.localeCompare(...)` with no guard, throwing TypeError and
   breaking the navigation surface. Two unfinished runs are needed so the sort
   comparator runs.

## Exact change (two layers, both tiny)
1. `src/backup-validation.js` `validateSave`: for each run in `v.runs`, when
   `r.updatedAt` is present (not `undefined`/`null`), require
   `typeof r.updatedAt === 'string'`, length <= 40, `Number.isFinite(Date.parse(...))`,
   else throw `Error('Invalid save date.')` — mirroring lines 51-57.
   Do NOT require presence: fresh runs have no `updatedAt` until the first move
   (`src/club.js:1001`). Scope to `updatedAt` only; other date fields on Club
   runs are only truthiness-tested and cannot crash.
2. `src/house/model.js:134` comparator: compare `String(a.updatedAt ?? '')`
   so a navigation surface never throws on unexpected in-memory shapes.
   Behaviour for valid strings is identical. Leave line 93 alone (puzzle
   records always carry validated string dates).

## Tests that must fail first (RED on unpatched code)
- New cases in `tests/backup-validation.test.cjs` (follow its existing
  Club-save fixtures): numeric `updatedAt` on a run is refused; over-long and
  unparseable date strings are refused; absent `updatedAt` still validates;
   valid ISO string still validates.
- If `src/house/model.js` is importable in Node, add a case that
  `nextActivity([], [{updatedAt: 123}, {updatedAt: 'x'}])` does not throw;
  otherwise the comparator line is verified by review (one-line coercion).

## Proving check
`node --test tests/backup-validation.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Do not touch `dist/`, published IDs, or the application-JS budget
(only 75 bytes of headroom — this fix must be near size-neutral).
