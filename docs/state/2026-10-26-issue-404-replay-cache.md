# Block Cabinet bounded replay checkpoints (#404)

## Change

The replay cache now keeps a single active seed and encoded move history, with a state snapshot
at the start and every 64 moves, plus the current tip. Repeated reads of the same complete
history still return an independent copy of the cached result. Append-only play resumes from the
tip. Undo, a shortened log, or a changed branch resumes only from the most recent checkpoint
whose entire move prefix matches. Every input action is still validated and compared; a failed
replay leaves the prior valid cache available for recovery.

At the unchanged 500-move cap, the cache retains at most eight stride-boundary states (including
the initial state) plus one current tip: at most nine state snapshots for one seed and one
history. It does not retain every move-prefix state. No save schema, seed, piece definition,
replay-validation limit, or concurrent-save behavior changed.

The cap remains 500. The current exact-cap and reload fixtures establish legal play, save/restore,
undo, redo, and replay work. This change adds bounded recovery from shortened histories, but the
available evidence is still local Node and in-memory Club lifecycle testing. No constrained-phone
latency, device heap, physical Android, or throttled handset measurement is available to justify
raising the cap toward the 3,000-entry save-validation limit.

## Evidence

- Test-first regression: before the cache change, undoing the valid 500-move fixture to its
  499-move prefix executed 499 transitions and failed the new `<=64` transition bound. With
  64-move checkpoints, that shrink executes 51 transitions from the matching state at move 448.
  The 268-to-267 lifecycle path executes 11 transitions from move 256 instead of 267.
- `tests/block-replay-cache.test.cjs` compares shortened replay results to independent engine
  folds, verifies repeated reads do no additional rule moves, and confirms an invalid edit after
  a retained checkpoint is rejected without clearing the previously valid cache. Existing tests
  continue to cover same-length middle edits, malformed and sparse histories, state-copy
  isolation, seeds, restart, append, redo and actual repeated Club rendering.
- The exact-cap Club lifecycle still verifies the 500-move save and reload, undo to 499, persisted
  redo, redo back to turn 500, and another fresh session from the saved bytes.
- A local Node 24.22.1 timing sample on the fixed 500-move fixture measured a 10.471 ms cold
  replay, 1,000 exact cloned-log reads in 363.248 ms with no additional engine moves, and a
  1.311 ms 500-to-499 replay using 51 engine moves. These timings are one local desktop Node
  sample, not a throttled-device or handset result. The operation-count bounds are the more
  stable complexity evidence.
- `node tools/build.cjs` passed. It emitted 135,751 gzip bytes of JavaScript and 204,975 gzip
  bytes for initial code and content; no byte allowance changed.
- Focused suite passed: `node --test tests/block-cabinet.test.cjs
  tests/block-cabinet-phone-actions.test.cjs tests/block-motion.test.mjs
  tests/block-motion-delivery.test.cjs tests/block-replay-cache.test.cjs
  tests/block-replay-long.test.cjs tests/block-replay-cap.test.cjs` (7/7 files).
- Prettier check and `git diff --check` are part of final local verification. Full `npm run
  verify`, independent review and hosted CI are left to the coordinator's gate.

## CI shell-budget correction

The first published head failed the unchanged raw precache-shell ceiling: CI measured
`coreOfflineBytes` 1,937,979 minus `officialContentBytes` 517,619 = 1,420,360 bytes,
624 bytes above the 1,419,736.32-byte ceiling. The checkpoint states now live in an array whose
position implies its 64-move index. The same Block engine also shares one eight-index line array
for line clearing and uses equivalent 8×8 coordinate arithmetic. Every input action is still
validated, every cached prefix is compared, and an unsuccessful replay still leaves the valid
entry untouched.

After clearing ignored generated output, `node tools/build.cjs` measured 1,937,207 core offline
bytes and the same 517,619 official bytes: **1,419,588 shell bytes**, 148.32 bytes below the
unchanged ceiling. `node tests/budget.test.cjs` passed all 15 tests. Direct-node focused runs
passed the replay-cache (14), exact-cap (2), long-replay (5), Block Cabinet (7), and phone-action
(2) tests. The changed engine passed pinned Prettier. The local web build used dirty source
identity; the coordinator must verify the committed exact head in CI before merge.

## Remaining qualification

Keep #404 open and `blockCabinet.maxMoves` at 500 until constrained-device replay timing and
memory are measured, including reload at any proposed new cap. The fixture validates the current
boundary; it does not prove arbitrary 1,000- or 3,000-move histories are acceptable on a phone.
Existing owner actions in `HUMAN_TODO.md`, including physical Android acceptance, remain
unchanged.
