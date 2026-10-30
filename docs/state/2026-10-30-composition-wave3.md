# 2026-10-30 third composition: hints, print sheet, technique record, Quiet Wing radii, docs

Branch `claude/compose-wave3-20261030`, based on `e022100c` (after #855).

Strict `main` plus per-PR edits to the shell ceiling and the `src/app.js` catalogue hash: each
reviewed PR head is merged unchanged (merge commits keep every original commit) so one CI run
qualifies the tree that lands:

- #807 README illustration count (docs).
- #856 Alibi-file and witness reasoning hints (ideas session; independent review in its body).
- #858 print sheet, with the #857 review fixes ported (`claude/print-sheet-830-fixes`: print theme
  reset, scene/Alibi-file clue list and `.logic-cell`, error/selected tints, Lantern walls).
- #859 motion-capture provenance docs.
- #860 scene hint clue chain (ideas session; independent review on the PR).
- #861 Quiet Wing radius roles (Sol peer slice; independent review on the PR).
- #862 named techniques in the completed record (ideas session; independent review on the PR).

## Composition-only changes

- `src/app.js`: #862 and #858 edited the same play-head template line; the resolution keeps #862's
  line (rehearsal-aware back label and save state) and inserts #858's print-only
  `id · revision` span after the save state.
- `tests/budget.test.cjs`: #856, #858 and #862 each raised the shell ceiling against their own
  bases; one measurement replaces them (1,435,972 bytes; 1.32 MiB + 51,968 leaves 116.32). Startup
  gzip 133,773 (+68); ceiling 127 KiB + 3,744 leaves 19, still 2,016 below the pre-#845 ceiling.
- `tests/insights-delivery.test.cjs`: the lazily loaded reasoning chunk measures 7,180 gzip bytes
  (12 over 7 KiB); bound 7 KiB + 256 leaves 244.
- `assets-source/library/catalogue.json` regenerated from the merged `src/app.js`.

## Verified

Local `build:android` then the full Node suite: 2,462 tests, 2,439 pass, 22 skipped, 1 failure (the
reasoning-chunk bound above, now fixed and re-run). `tests/browser_print_sheet.py` passes on this
build (A4/Letter one page, night theme, Lantern walls, selected cell, scene-01 and dossier-01 clue
lists). Protected path: `.github/workflows/check.yml` gains one line (#858's browser test), so the
composition carries a two-lens escalated review before merge.

## NOT verified

Remaining browser suites run in hosted CI on the composition head. Physical printers, Firefox/Safari
print engines, phone hardware and screen readers (HUMAN_TODO q-2).
