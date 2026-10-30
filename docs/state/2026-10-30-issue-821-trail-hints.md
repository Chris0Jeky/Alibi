# Number trail reasoning hints (#821)

## Scope

`src/insights.js` only: a new `trailDeduction` used by `deduction` for `trail` puzzles after the
existing rule validation. No save format, puzzle identity, revision, reveal, telemetry or UI markup
changed. The Hint dialog and Club's forced step consume the usual `{ rule, message, cells, value }`.

## Rules (answer-independent)

A missing number lies on the path between its nearest placed neighbours, so it must sit within
`m - below` steps of the lower one and `above - m` steps of the upper one, counting steps only
through open squares (the intermediate numbers are all unplaced, so their squares are open).

- *Only one square in reach*: a missing number with exactly one open square within reach of both.
- *Only one number reaches*: an open square that exactly one missing number can reach (every
  square holds a number).
- Correction prompts when a missing number or an open square has no possibility.

A neighbour-support refinement was measured (+1 board) and left out.

## Outcome (trusted registry, fresh boards)

Before: no trail ever received a reasoning hint (44/44 got only the generic tip).
After: 27/44 offer a reasoning hint from the start; 13 are completed by hints alone; a hint walk
across all 44 places 215 numbers with zero wrong values; median reach 11%.

## Evidence

- `tests/trail-insights.test.cjs`: soundness walk over all registry trails with a Proxy that throws
  on `solution`; a ≥27-board floor; a two-sided gap fixture; the cell-side rule on
  `curated-trail-06`; a too-far-apart correction. All five fail on the previous `src/insights.js`.
- `tests/insights.test.cjs` still passes; Prettier clean.

## Limits and remaining gates

17 fresh trails still stall at the start; longer-path and parity reasoning are not implemented.
Human judgement of wording, phone-width inspection and hosted CI remain.
