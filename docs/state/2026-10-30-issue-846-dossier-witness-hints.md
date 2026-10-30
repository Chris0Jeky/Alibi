# Alibi file and witness reasoning hints (#846)

## Scope

`src/insights.js`: new `dossierDeduction` and `witnessDeduction`, dispatched after rule
validation. Stacked on the 2026-10-30 composition (#853). No save, content, reveal or UI change.
`tools/hint-reach.cjs` now loads `src/assist.js` (the app always does), so crime-scene hints from
#850 are measured; `tests/hint-reach.test.cjs` ceilings and floors are tightened to the composed
tree.

## Rules (answer-independent)

Alibi files (two person × value grids; marks -1 open, 0 no, 1 yes; a yes rules out its row and
column):
1. A direct clue contradicted by a mark asks for a correction (checked before any suggestion).
2. *A clue to record*: the first unrecorded `eq`/`ne` clue, with the mark to make.
3. *Only one option left*: a person row or value column with one open cell and no yes.
4. *Follow a linked clue*: a person's known room carries across to the linked object, or back.
Results carry `mark: { cell, value }` and no `value`, because these grids take `mark` moves; Club's
forced step (which applies `{ type: 'set' }`) therefore shows the explanation without applying it.

Witness statements: *Test one person* — the first non-accused person whose assumption makes a
different number of accounts true than the evidence states, with the accounts listed.

## Outcome (trusted registry, fresh boards)

| Family | Silent before | Silent after | Hint walk |
|---|---:|---:|---|
| Alibi files (29) | 29 | 0 | 473 marks, 0 wrong; every file completed by hints alone |
| Witness statements (31) | 31 | 0 | never rules out the culprit |

Composed tree after this change: scene 8, futoshiki 2, trail 17, lightup 2 silent; every other
family 0.

## Evidence

- `tests/dossier-witness-insights.test.cjs` (4 tests, Proxy on `solution`): all fail on the
  composition's previous `src/insights.js`, all pass now.
- `tests/hint-reach.test.cjs` (21) with tightened ceilings; `tests/budget.test.cjs`,
  `tests/insights-delivery.test.cjs`, `tests/insights-loader.test.cjs`, the other insights suites,
  `tests/asset-catalogue.test.cjs` pass after `npm run build`.
- Budgets: reasoning chunk 6,008 → 6,886 gzip (cap 6 → 7 KiB); precache shell +2,397 on the tree
  after #855 (ceiling +2,432, 98.32 bytes left), both documented beside the assertions.

## Limits

Witness hints repeat the first ruled-out person rather than tracking which the player has tested.
Wording, phone-width inspection and hosted CI remain. This PR lands after #853.
