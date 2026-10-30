# 2026-10-30 issue #830: print a clean pen-and-paper sheet

Branch `claude/print-sheet-830-b`, based on `f30c6090`. Acceptance target: Picture logic.

## Changed

- `src/app.css`: one `@media print` block (plus `@page { margin: 12mm }` and a screen-hidden
  `.print-only`). Scoped to `.shell.playing`, so other routes print as before. Interface
  furniture is hidden by structural complement, so a new control is hidden by default:
  everything in `.shell` except `.main-wrap`, everything in `.main-wrap` except `.main`,
  everything in `.main` except `.play-head` and `.player-grid`, the back/help buttons,
  save state and timer, the evidence column, `.play-secondary`/accusation/play-end, and
  everything in `.board-card` except `.board-wrap` (heading, instruction, controls, main tools,
  feedback, paused cover), plus `.toolrow`/`.control-note` inside the board, dialogs, toasts and
  the skip link. Shown: title, family and difficulty, board, row and column clues and the key.
  Board: black on white, 170 mm wide at most, cell hairlines, filled cells printed black
  (`print-color-adjust: exact`), `break-inside: avoid`, no inner scrolling.
- `src/app.js`: the play head gains `<span class="print-only">id · revision N</span>`.
  No solution data is added to any markup; the Node test scans the play and board functions.
- `tests/print-sheet.test.cjs` (source contract), `tests/browser_print_sheet.py` (print-emulated
  A4 and Letter, fresh and marked board, screenshots, PDF page count), wired as one line in the
  `check.yml` IndexedDB step (full mode, port 8797). `.github/workflows` is a protected path.
- `tests/budget.test.cjs`: shell ceiling 1.32 MiB + 42,944 -> + 44,160 (measured 1,428,193 bytes,
  +1,398 over the composed base; 87.32 bytes left). Startup gzip 202,519 of 225,280, unchanged.
- `assets-source/library/catalogue.json`: regenerated for the `src/app.js` hash.

## Verified

- `node --test tests/budget.test.cjs tests/print-sheet.test.cjs tests/browser-wiring.test.cjs tests/ci-scope.test.cjs`: 45 pass.
- `PORT=18830 node tools/serve.cjs` and `ALIBI_URL=http://127.0.0.1:18830 py -3 tests/browser_print_sheet.py`
  against a fresh build: `nonogram-01` (5x5) and `nonogram-large-01` (15x15), A4 (794x1123) and Letter
  (816x1056), fresh and with three marked cells: title, stamp, board and 2n clues visible; furniture
  hidden; board inside one page height; zero filled cells and no solution text in the fresh DOM;
  marked cells computed black; `page.pdf` A4/Letter with `prefer_css_page_size` is one page with
  the right MediaBox. Screenshots: `test-results/print-*.png` (ignored).
- Prettier check on the changed files, `git diff --check`, `py_compile` of the new test.

## NOT verified

- Other families beyond a no-break expectation (their board and axes print; not screenshotted).
- A physical printer, Firefox/Safari print engines, and the browser print dialog's own margins
  and headers/footers. The PDF was not rasterised here (no poppler); page count and paper size
  come from the PDF structure.
- The night theme and high-contrast print (tokens are forced on `.shell.playing`; not screenshotted).

## Residual risk

- The `Check` error highlight and hint-focus backgrounds are not neutralised; they print only if
  the player ran Check or a hint before printing.
- The shell ceiling has 87 bytes of headroom; the next shell change needs its own entry.
- Branch name `claude/print-sheet-830` is held by another worktree (`agent-af09118e977b6e0af`),
  so this branch carries a `-b` suffix.

HUMAN_TODO.md: no item added or closed by this change.

## Review fixes

Ported from the #857 review (commits a7eb64ea and 5ed77993, written against that branch's
different selectors) onto this branch's structural hiding. This closes the "Residual risk" and
"NOT verified" notes above about the night theme and the Check/selection tints.

- Night theme: `.shell.playing` now also resets `--green-soft`, `--water`, `--room-0..7` and
  `color-scheme: light`; the night rules that hard-code pale ink (`.scene-cell`, `.furniture`,
  `.room-label i`, `.tank-code`, lamp icons) print `#000`, and a lit Lantern floor prints light.
- Crime scenes and Alibi files: the evidence column is shown only when it holds a clue list
  (`.player-grid:has(.evidence-list)`); its tabs, play-context, info note and checkboxes stay
  hidden and a ticked clue prints without its strike-through. `.logic-cell` was never hidden here
  (no `button:not(.cell)` rule) and the browser test now proves it.
- Tints: `.cell.error` and `.cell.selected` print white with the plain grid line. The
  `.axis.target.met/.over` tints were already cleared by the existing `:is(.axis, .nono-clue)`
  rule, which is now asserted.
- Lantern walls print black with white numbers (print-color-adjust inherits from the shell).
- Tests: `tests/browser_print_sheet.py` gains night sudoku and scene, Lantern, selected cell, scene
  and Alibi-file clue checks; `tests/print-sheet.test.cjs` asserts the new rules.
- Shell ceiling: the existing #830 entry now reads 1,426,795 -> 1,429,143 (+2,348; excess
  2,078.68 over the pre-#830 ceiling); ceiling +45,120 (34 x 64 steps) leaves 97.32 bytes; no feature
  room. Startup gzip 202,521 of 225,280.
- Still not neutralised: the dashed hint-focus outline (the `.peer` tint is white now that `--green-soft` and `--cell` are).
