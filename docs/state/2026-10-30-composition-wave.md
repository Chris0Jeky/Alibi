# 2026-10-30 composition: hint wave, Scene Maker, render, cold pages, port, House radii

Branch `claude/compose-wave-20261030`, based on `aeb6656ef51bef6c8ae69d48ab4c22a2b06a6cd7`.

Strict `main` plus per-PR edits to `assets-source/library/catalogue.json` (the `src/app.js`
hash) and the shell ceiling in `tests/budget.test.cjs` made serial landing cost one full CI
cycle and one conflict per PR. This branch merges each reviewed PR head unchanged (merge
commits preserve every original commit) so one CI run qualifies the tree that lands:

#841 (port 8797), #843 (House radius roles), #819 (Sudoku/Futoshiki hints), #839 (first
puzzle letter), #847 (hint-reach floor), #849 (HUMAN_TODO sharing decision), #836 (Number
trails hints), #850 (crime-scene hints), #845 (deferred Privacy chunk), #838 (level-aware
Another puzzle), #842 (staged hints), #840 (Scene Maker conflict diagnosis, with its
`wait_for` fix) and #829 (board analysis once per render; reviewed, no separate PR).

## Composition-only changes

- `src/insights.js`: #836 and #850 each added one dispatch line at the same spot; both kept.
- `assets-source/library/catalogue.json`: regenerated with `node tools/assets/catalogue.cjs`
  after each merge that touched `src/app.js`.
- `tests/budget.test.cjs`: #836 and #850 each raised the shell ceiling against their own base.
  One measurement of the composed build replaces them: 1,426,795 bytes (1.32 MiB +
  42,674.68); ceiling 1.32 MiB + 42,944 leaves 269.32 bytes. #845's lowered startup-gzip
  ceiling holds with every component included.

## Verified

Local build of the composed tree; `tests/budget.test.cjs` 17/17 at the new ceiling. Each
component PR carries its own independent review and focused evidence. Hosted CI on this head
is the full qualification (Node, browser, offline, native).

## NOT verified

The full local Node and browser suites were not run here (host RAM below 1 GB at the time).
#807 is excluded (separate native-emulator investigation, #785). No deployment.
