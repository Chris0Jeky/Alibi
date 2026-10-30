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

## Review fixes (2026-10-30, driver)

Independent review found three print defects, fixed in the same `@media print` block:

- Night theme: theme variables are reset to light values for print, so givens, axes and room
  tints no longer print pale on white (browser check: a night-theme Sudoku given prints
  `rgb(0, 0, 0)`).
- Crime scenes and Alibi files keep their clues beside the board: the evidence column prints
  its clue list (tabs, notes and controls hidden), and Alibi-file grid cells (`.logic-cell`
  buttons) are no longer hidden. `scene-01` prints board, room key and all six clues (2 A4 pages).
- Check and selection tints (`.cell.error`, `.cell.selected`, met/over targets) do not print.
- Lantern walls print solid black with white numbers (`print-color-adjust: exact`), from Codex review.

`tests/browser_print_sheet.py` now has 10 checks (adds night theme, Lantern walls, `scene-01`, `dossier-01`); the
night check fails on the previous CSS. Shell ceiling raised to +1,600 over the composed base
(25 × 64, 64.32 bytes left). Not verified: Firefox/Safari print, physical printer, the evidence
column when a player left the Notes tab open (the clue list is then not in the DOM).
