# Issue 865: hint follow-ups

Branch `claude/hint-followups-865`, based on `origin/main` 8d6f177f. Not pushed, no PR.

## Changed

1. `tests/techniques.test.cjs`: the `hidden()` Proxy now also records every attempt to reach
   `solution` (`get`, `has`, `getOwnPropertyDescriptor`) in a `reads` array, because
   `techniques()` swallows the Proxy's throw. "Every official puzzle can be summarised without
   reading the answer" asserts `reads` is empty and that every family with working hints
   (sudoku, nonogram, binary, futoshiki, lightup, tents, trail, dossier, scene) yields a non-empty
   line for at least one official puzzle, so a silently failing walk cannot pass either.
   Production `catch { used.clear(); }` is unchanged: a failed walk only hides the line.
2. `src/insights.js` memo: Workshop "Rehearse" runs `newRun(draft)`, which clones the draft but
   keeps its id and `revision: 1` (`createSceneDraft`; clue edits never bump either). The
   Review-the-record dialog calls `techniques(current.puzzle)`, so the old key
   `p.id + '@' + p.revision` could show a stale line for an edited draft. The memo is now a
   `WeakMap` keyed by the puzzle object (each rehearsal's clone is a new key). A new test covers it.
3. `src/insights.js`: the "Number trails" comment is back above `trailDeduction`.
4. `tests/dossier-witness-insights.test.cjs`: asserts the `Suppose ` prefix and that a suspect was
   found (`named !== -1`) before the `named !== solution` check.

## Verified

- Mutation 1: injected `void p.solution` inside `techniques()`'s `try`. The old test body passes
  (the throw is swallowed); the new test fails ("techniques() must not touch the stored
  solution"; the sudoku and placements tests also fail as the walk returns `[]`). Reverted.
- Mutation 2: the original `origin/main` `src/insights.js` fails the new same-id/revision test.
- `npm run build:android` ok; `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`
  after commit: 2478 tests, 2456 pass, 0 fail, 22 skipped.
- Budgets: no ceiling needed a raise (`budget.test.cjs`, `insights-delivery.test.cjs` pass).
  Insights chunk 17376 bytes, 7170 gzip, against a 7424 bound (254 bytes left). Source grew 78
  bytes (33914 to 33992). `src/app.js` is unchanged, so the catalogue was not regenerated.
- Prettier run on the changed JS files.

## NOT verified

Browser suites and a real Rehearse run (no UI change, not needed per the brief); the stale-line
scenario is proven at `techniques()` level with a same-id/revision twin, not through the dialog.
The 7170 gzip figure is post-change only; the pre-change figure was not re-measured.

## Residual risk

A puzzle object mutated in place after `techniques()` would keep a stale memo. Nothing in the
app does this (runs hold a cloned puzzle). Memo hits are lost when a stored run reloads its
puzzle object, costing one walk (tens of ms) per record dialog.
