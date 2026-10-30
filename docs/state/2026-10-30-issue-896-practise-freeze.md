# Issue 896 item 2: Practise a technique no longer freezes the tap (2026-10-30)

Branch `claude/practise-freeze-896`, cut from `origin/main` 64cbe3c3 (main had not moved at the end of
the work). Item 2 of #896 only. Item 1 (startup validation, `src/engines.js`) and item 3 are untouched.

## Changed

- `src/app.js`: `walkTechniques()` runs the family's `techniques()` walks in slices (about 8 ms of work,
  then a `setTimeout` yield) instead of one synchronous filter inside `libraryPage()`. While any puzzle
  of the page's family is un-walked the page renders "Finding puzzles that use <technique>..." in the
  existing `#library-filter-status` line with an empty grid (no "No matches" block), then renders the
  finished list once. A `WeakSet` records walked puzzle objects; the results are still the per-puzzle
  `WeakMap` memo in `src/insights.js`, so the matched set is identical to before.
  - Cancels cleanly: a newer walk, clearing or changing the technique, or leaving the page (the route
    serial from #870) stops the walk; leaving also clears `library.technique`, so coming back to the
    family does not restart a filter the player abandoned.
  - The yield is `setTimeout`, not `scheduler.yield()`: the latter's continuation outranked the
    `hashchange` that cancels the walk, so the walk finished before the page change was processed
    (found by the browser check below).
  - Focus: `loadRoute` still focuses `#library-filter-status`; `render()` restores focus by id after
    the final render, so focus stays on the count line.
  - `src/insights.js` is unchanged (the insights chunk bound is untouched: 17,376 bytes, 7,170 gzip).
- `tests/browser_ui.py`: `practise_check()` for Sudoku and Picture logic: the shown count equals a direct
  `AlibiCore.insights.techniques` walk over the official definitions, no task longer than 400 ms at 4x CPU
  (CDP `Emulation.setCPUThrottlingRate`), the "Finding puzzles" status appears, focus is on the count line,
  and for Picture logic a walk abandoned by going Home leaves no filter or "Finding" line when the family
  is reopened.
- `tests/budget.test.cjs`: startup gzip 135,378 -> 135,556 (+178), ceiling 127 KiB + 5,376 -> 5,568
  (87 x 64, leaves 60); shell 1,442,894 -> 1,443,368 (+474), ceiling 1.32 MiB + 58,944 -> 59,264
  (926 x 64, leaves 16.32; next step 927 x 64 if it falls below 16). Both documented in the existing style.
- `assets-source/library/catalogue.json` regenerated (`node tools/assets/catalogue.cjs`).

## Verified

Long tasks after clicking "Practise" in a completed record, Chromium, CDP CPU 4x, one run each on this
machine (the filtered result was identical: 40 Picture logic and 37 Sudoku puzzles):

| Family | origin/main longest task | this branch longest task | this branch total busy time | wall to list |
| --- | --- | --- | --- | --- |
| Picture logic (nonogram) | 1,866 ms (one task) | 125-140 ms | about 1,100-1,570 ms in 14-17 tasks | 1.5-1.9 s |
| Sudoku | 756 ms (one task) | 137-145 ms | 207-269 ms in 2-3 tasks | 0.75-0.9 s |

The earliest baseline run of Picture logic read 3,401 ms (first run on a cold machine); the table uses the
steady 1,866 ms. Remaining tasks are one large puzzle's walk each (a 15 x 15 walk is atomic) and stay well
under the 250 ms mark but above 50 ms at 4x; at 1x they are a quarter of that.

- Mutation proofs: with `origin/main`'s `src/app.js` rebuilt, `tests/browser_ui.py` fails at "sudoku
  practise keeps every task under 400 ms at 4x CPU (longest 774 ms)". With the fix but without the
  `library.technique = ''` on leaving, it fails at "nonogram abandoned practise walk leaves no filter"
  (the returning page showed "Finding puzzles..."). With `scheduler.yield()` the same abandoned-walk check
  failed at first, which is why `setTimeout` is used.
- `npm run build:android` on a clean tree; `node --test --test-concurrency=2 tests/*.test.cjs
  tests/*.test.mjs`: 2,508 tests, 2,486 pass, 0 fail, 22 skipped.
- `py -3 tests/browser_ui.py` (final build, 1440 px): 307 browser checks pass; sudoku longest 129 ms,
  Picture logic longest 143 ms at 4x in that run. An earlier run measured sudoku 253 and 311 ms
  (the 311 was against a 250 ms limit, hence the 400 ms bound; `origin/main` measures 756-774 ms).
- Prettier clean for `src/app.js` and `tests/budget.test.cjs`.
- Phone (390 x 844, touch) and desktop (1440 x 1000) screenshots of record -> technique -> list in the
  "Finding puzzles that use ..." state and the finished list; both read correctly, focus is on the count line.

Re-measured after merging main (#897): startup gzip 135,594 under 127 KiB + 5,568 (22 left, unchanged ceiling); shell 1,443,050 -> 1,443,524, ceiling 1.32 MiB + 59,456 (929 x 64), 52.32 left. These replace the shell entry above.

## NOT verified

- A physical Android device or a real throttled phone; CDP throttling slows only the main thread.
- Firefox and Safari. `tests/browser_origin.py` (real IndexedDB and service worker) was not run; storage and
  the service worker are untouched. `tests/quiet-wing/*.cjs` (part of `npm test`) was not run.
- Library families other than Sudoku and Picture logic (the walk is generic; only these two were timed).
- Screen-reader announcement of the status change (focus stays on the count line, but no assistive
  technology was used).

## Residual risk

- A single large puzzle is still one task of about 100-140 ms at 4x; the deduction walk itself is not made
  incremental. Slicing inside `techniques()` would need a change to `src/insights.js` and the insights bound.
- Wall time to the list is about unchanged (origin/main 2.0 s Picture logic and 1.0 s Sudoku at 4x; this
  branch 1.5-1.9 s and 0.75-0.9 s); each yield costs a timer tick, but input is no longer blocked.
- The startup bundle ceiling now leaves 60 bytes and the shell ceiling 16.32; the next change to
  `src/app.js` needs its own raise ("no feature room").
- The 400 ms bound in `tests/browser_ui.py` is a timing check on a shared machine: `origin/main` exceeds it
  by roughly 2x for Sudoku and 4x for Picture logic, the fix stays under about 310 ms.

`HUMAN_TODO.md` has no new item from this slice.
