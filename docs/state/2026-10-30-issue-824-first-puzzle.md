# First-run "Find my first puzzle" opens a puzzle (#824)

## Scope

`src/club.js` home letter only. With no run in progress:

- no solved puzzle: *Find my first puzzle →* opens `nonogram-01` (*The diamond*, Picture logic,
  Gentle 5×5), whose lesson starts automatically for a newcomer; if that id is ever missing it
  falls back to the library as before;
- at least one solved puzzle: the button reads *Find another puzzle →* and opens the library
  (it previously still said "first").

An in-progress run keeps *Continue your puzzle/game →*. No save, content, route or style change.

## Why this puzzle

Picture logic is widely known, the board is tiny, a picture appears as the reward, and its
reasoning hints carry every official Picture logic board to completion (hint-reach scan in #818).

## Evidence

- `npm run build` then `tests/budget.test.cjs` and `tests/radius-scale.test.cjs` pass
  (`javascriptGzipBytes` 134,158 on this build).
- Built app on a fresh origin (127.0.0.1:8798): one click on the letter opens *The diamond* with the
  Picture logic lesson; after completing it, home shows *Find another puzzle →* and "1 solved";
  the same label is present at 375 px width.
- No browser test targets the old letter button (`rg "first puzzle|club-letter" tests`).

## Limits

The starter is a fixed choice, not personalised. Physical-phone and new-player judgement remain.
