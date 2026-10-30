# Sudoku and Futoshiki hint reach (#818)

## Scope

`src/insights.js` reasoning hints for Sudoku and Futoshiki only. Added hidden singles, memoised
Futoshiki inequality-chain bounds and explicit correction prompts when a square or number has no
place left. No save format, puzzle identity, revision, reveal path, telemetry or UI markup changed;
the Hint dialog renders the new rule and message unchanged. Club's "forced step" consumes the same
`{ rule, message, cells, value }` shape.

## Outcome (measured over the trusted registry, fresh boards)

| Family | Boards | No hint at start (before → after) | Solved by hints alone | Median reach |
|---|---:|---:|---:|---:|
| Sudoku | 49 | 21 → 0 | 16 → 20 | 7% → 40% |
| Futoshiki | 51 | 27 → 2 | 1 → 10 | 0% → 19% |

The two remaining silent boards are Master Vault studies (`vault-futoshiki-13`, `-17`).

## Evidence

- `tests/insights-reach.test.cjs`: soundness and answer-independence (Proxy on `solution`) across
  all 100 registry Sudoku/Futoshiki boards; no silent fresh board below Master; a hidden-single
  fixture; a 3-cell inequality chain; a no-candidate correction. Four of five fail on the previous
  `src/insights.js` (the soundness test passes on both, as it should).
- Existing `tests/insights*.test.cjs`, `tests/budget.test.cjs` and
  `tests/content-budget-accounting.test.cjs` pass after `npm run build`.
- A fully chained 9×9 Futoshiki draft (144 inequalities) returns in 7 ms.
- Built app at 127.0.0.1 (desktop width): Hint on `sudoku-04` now shows "Only one place for a
  number" with the row/column/box explanation instead of the generic tip.

## Limits and remaining gates

Pair, pointing and longer-chain techniques are not implemented, so hints still stall partway on
harder boards. Human judgement of the wording, phone-width inspection and hosted CI remain.
