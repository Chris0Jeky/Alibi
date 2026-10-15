# fix-engine-feedback: nonogram premature Solved + dossier link feedback

Two small, orchestrator-verified engine defects. One worker, existing
harness (`tests/core.test.cjs`; follow its registry style).

## 1. Nonogram complete() ignores unknown cells (HIGH, normal-play reachable)
`src/core.js:420-426` compares row/col runs without requiring determined
cells. `runs()` (line 14) treats `-1` (unknown) as empty, so a board whose
runs already match but with un-crossed empties is declared Solved —
permanently locking the puzzle with a state that differs from the published
solution. Siblings require determined cells (sudoku `:411` needs `v > 0`,
binary `:435` needs `v >= 0`).
- Exact change: prefix the nonogram `complete` with
  `s.cells.every((v) => v >= 0) &&` (mirror binary). Nothing else reads
  `complete` except the Solved gate; solvers/uniqueness do not use it.
- RED tests (extend `tests/core.test.cjs` nonogram section): a board with
  matching runs but one `-1` where empty belongs is NOT complete; the same
  board with that cell crossed (0) IS complete; untouched all-`-1` board of
  an all-empty-clue puzzle is NOT complete. All three fail on old code.

## 2. Dossier validate() never evaluates link clues (MEDIUM, feedback gap)
`src/engines.js:334-336` skips `link` clues, so a board that provably
contradicts one on committed cells returns zero issues until completion
(`dossierReady` line 80 does check links — completion is correct).
Naively evaluating links on partial boards is WRONG: `dossierMatch` line 49
reads `a[size + indexOf(c.a)]`, and an unassigned `c.a` yields index `-1`,
reading the wrong cell.
- Exact change: in the line-334 loop, evaluate link clues only when both
  endpoints are committed (`indexOf(c.a) >= 0` in cat 0 AND the linked cat-1
  assignment `>= 0`); otherwise skip as today. Keep the existing
  committed-guard for eq/ne. Player-facing issue text via `dossierClue`.
- RED tests (extend `tests/core.test.cjs` dossier section): committed board
  contradicting a link clue yields an issue naming that clue (fails on old:
  zero issues); the same contradiction with an uncommitted endpoint yields
  no link issue (guards the false-positive direction).

## Proving check
`node --test tests/core.test.cjs tests/nonogram-large.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Watch the application-JS budget: only ~75 bytes of headroom at wave start —
keep both changes minimal (a few expressions, no helpers/tables). If the
budget test fails, report exact overage instead of trimming blindly.
Do not touch `dist/`, published IDs, revisions, or solutions.
