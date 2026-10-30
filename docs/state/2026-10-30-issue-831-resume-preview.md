# Issue #831: saved nonogram card previews

## Changed

Active nonogram cards pass their saved state to the existing art renderer. One SVG
path draws exactly the cells marked `1`; crossed (`0`) and empty (`-1`) cells stay
blank. The renderer uses the existing palette, board footprint and `puzzle-art`
class. It never reads the solution. Card accessible names stay unchanged and art
remains hidden from assistive technology. Completed/unstarted cards and other
families retain decorative art. The library caption now describes both kinds.

Appears in `#/library` (including the Picture logic family and favorites filters)
and `#/journal`, under “Pick up the thread” and active favorites in “Saved for a
quieter moment”. Solved-pile cards retain their motif. Casebook chapter rows and
the Club home renderer do not use this card renderer.

Raw source bytes against base `a30428c0d0ebe8fffa0670164f12764604214007`:
`src/app.js` 219,892 -> 219,942 (+50);
`src/presentation.js` 29,884 -> 30,212 (+328). Total source growth: 378 bytes.

## Verified

- `node --test tests/resume-preview.test.cjs tests/render-analysis-once.test.cjs tests/presentation-icon.test.cjs`:
  13 passed, zero failed/skipped; six are new preview tests. They exercise actual
  extracted card/run-selection functions, a throwing `solution` getter, exact saved
  square coordinates, state changes, blank/crossed cells, largest grid, fallback
  motifs, accessibility markup and input preservation.
- Before production edits, `node --test tests/resume-preview.test.cjs` returned
  exit 1: four failed, two passed. The old motif had no saved-cell path and changing
  a saved cell left the SVG identical. After the change all six passed.
- Prettier check on all four changed files and `git diff --check` passed.

## NOT verified

No install, build, browser, server, hosted/native/device check or Git write was run,
per the worker brief. Driver owns phone-width inspection and emitted gzip/precache
measurements plus any measured, documented budget-ceiling entry. Budget limits
are unchanged here. [HUMAN_TODO.md](../../HUMAN_TODO.md) remains unchanged; physical
Android/TalkBack and other owner acceptance items remain open.

## Residual risk

Source growth can exceed the tiny emitted-budget headroom; raw bytes do not predict
gzip growth. Visual legibility at phone width remains unverified. Crosses are
intentionally blank in the preview. Driver commits the four-file change.
