# Issue 830: print a clean pen-and-paper sheet

Branch `claude/print-sheet-830`, based on the composition wave that merged to `main` as `f30c6090`.

## Scope and outcome

One `@media print` block at the end of `src/app.css` (no JavaScript, so no `src/app.js` receipt
refresh). Printing a play route (`#/play/<id>`) gives one black-on-white sheet:

- Printed: puzzle title, family eyebrow, difficulty, size, and the board with its clues.
- Dropped: sidebar, top bar, banners, mobile nav, footer, Zen exit, evidence column (story, room,
  assistance, clues list), toolbars, number pad, undo/redo/hint/check, zoom/pause, legend and
  counters, feedback, save label, timer, completion panel, dialogs, toasts and every non-cell button.
- Picture logic specifically: cell fills, crosses and the "met" clue tint from a saved run are not
  printed, so the sheet is blank to solve by hand. Clues are black at 15px.
- Other families: same chrome removal and black grid lines; entered values and givens still print
  as the player has them. They may print imperfectly (coloured tints, region art are not tuned).
- The solution is never rendered, so it is never in the printed DOM; the test asserts this.
- Revision is not shown on the play route today, so it is not printed.

## Evidence

- `tests/browser_print_sheet.py` (Chromium print emulation, `ALIBI_URL` honoured): `nonogram-01`
  prints title, board and all 10 clues with the first-visit dialog open; chrome and every non-cell
  button are hidden; a filled cell computes white and shows no mark; the page HTML contains neither
  the word "solution" nor the solution array; `page.pdf` gives one page on A4 and on Letter.
  `sudoku-01` and `tents-01` print without error, with chrome hidden and no solution in the DOM.
- `node tools/build.cjs`, then `node --test tests/budget.test.cjs tests/radius-scale.test.cjs`
  (23 pass) and `tests/asset-catalogue.test.cjs` (2 pass).
- Budget: precache shell raw bytes 1,426,795 -> 1,427,775 (excess over the old ceiling 710.68);
  ceiling raised +768 to 1.32 MiB + 43,712 (57.32 bytes headroom). Startup gzip unchanged.
- `npx prettier --check` on `src/app.css` and `tests/budget.test.cjs`.

## Not verified

- A physical printer or the browser's own print dialog (headless emulation and `page.pdf` only).
- Firefox and Safari print engines; the 15 x 15 nonogram (none ships; the largest is 7 x 7).
- Families other than Picture logic, Sudoku and Tents.
- The new test is not wired into a workflow file.

## Remaining gates

Review per the repository PR gate. Owner decisions: see `HUMAN_TODO.md` (none added here).
