# Print sheet keeps the clues on the Notes and Rules tabs (#866)

## Changed

- `src/app.js`: the scene and Alibi-file clue list moved into one `clueList(p, s, print)` helper.
  The Evidence tab uses it unchanged. With the Notes or Rules tab selected, `evidence()` also
  renders a screen-hidden copy: `<h2 class="print-only">`, `<div class="case-intro print-only">`
  and `<div class="evidence-list print-only">`. No solution data is read.
- `src/app.css` (print block): the print-only heading and intro print as blocks, the list as a
  grid, and when the evidence body holds such a list every non-print-only child (the notes
  textarea, the rules text) is hidden. On screen the unconditional `.print-only { display: none }`
  still hides the copy.
- `tests/print-sheet.test.cjs`, `tests/browser_print_sheet.py`: source and CSS assertions, plus a
  real-tab check for scene-01 and dossier-01 on Notes and Rules.
- `tests/budget.test.cjs`: documented raises re-measured on main after #867: startup gzip
  134,213 -> 134,296 (ceiling 127 KiB + 4,288, 40 left); shell 1,437,882 -> 1,438,353 (ceiling
  1.32 MiB + 54,272, 39.32 left).
- `assets-source/library/catalogue.json`: refreshed by `node tools/assets/catalogue.cjs`.

## Verified

- `node --test tests/print-sheet.test.cjs` 9/9; `node --test tests/budget.test.cjs` 17/17 after
  the documented raises; `tests/asset-catalogue.test.cjs`; Prettier on the JS, CSS and test files;
  `git diff --check`; `py_compile` of the browser test.
- `tests/browser_print_sheet.py` against `npm run build` output served on port 18866 passes,
  including `scene-01` (6 clues) and `dossier-01` (8 clues) on both tabs: in print, the clue count
  equals the puzzle's clues, one heading and intro show, no notes textarea or rules text, tabs and
  foot hidden; on screen the print-only list exists, is not visible, and the tab's own content
  shows. Screenshots are in `test-results/` (ignored).

After merging main (#867): `build:android` + full Node suite 2,448 pass / 7 fail, the 7 all in
`tests/android-build.test.cjs`, which then passed 15/15 alone (load from a concurrent worktree
build). `browser_ui.py` 286/286. `browser_print_sheet.py` failed once in that loaded run on the
night-theme `.room-label i` ink check and passed on an immediate rerun; untouched by this change
(the #830 rule), noted here rather than dismissed.

## NOT verified

- No physical printer or phone; print is emulated Chromium and PDF page counts for the
  Picture-logic cases only. The Notes and Rules sheets were not PDF-paginated for page count.
- No Firefox or Safari `:has()` check (the existing print rule already depends on `:has()`).

## Residual risk

- A duplicate set of clue buttons exists in the DOM on those tabs; it is `display: none` on screen
  so it is not focusable or announced, but a future rule that unhides `.print-only` generally
  would expose it.
- Budget headroom is 36 gzip and 92 shell bytes: no feature room.

HUMAN_TODO.md: no new items from this change.
