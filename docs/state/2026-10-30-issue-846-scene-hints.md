# Issue 846 slice: crime-scene reasoning hints

Branch `claude/scene-hints`. Refs #846 (witness statements and alibi files still offer only the
generic tip, so the issue stays open).

## Scope

`src/insights.js` `deduction(p, s)` gains a `scene` branch, `sceneDeduction`, after the existing rule
validation. It reads only the board and the clues, never `solution`:

1. Candidates per unplaced person come from `AlibiAssist.reason` (furniture, rows and columns taken
   by placed people, single-person clues, pair clues whose other person is placed).
2. Pair clues (`C.scenePair`) prune those candidates to a bounded fixpoint.
3. Someone with no candidate: `Revisit a conflict`.
4. Someone with one candidate: `Only one square left`, with `cells: [cell]` and `person`, and
   deliberately no `value` (Club's forced step refuses it and shows the message). The message names
   the clue texts that did the pruning.
5. A row or column with no placed person that exactly one unplaced person can fill: the same hint if
   that person has one square there, otherwise a message-only `Only one person fits a row/column`.
6. Everyone placed and no accusation yet: `Time to accuse`, pointing at the final deduction without
   naming the culprit.

Without `AlibiAssist` the branch returns `null`, so the generic tip shows as before.

## Measured, 43 official scenes, fresh boards

|                                                                    | Before | After                                            |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------ |
| Scenes whose Hint shows only the generic tip                       | 43     | 8                                                |
| Scenes with a reasoning hint                                       | 0      | 35 (26 name a square, 9 message-only row/column) |
| Scenes fully placed by following `Only one square left` repeatedly | 0      | 6                                                |
| Wrong steps (placed cell differs from the stored answer)           | n/a    | 0 over 58 steps                                  |

The issue's prototype reported 17 silent because it counted message-only line hints as silent; those
9 now answer with the row/column hint. Precache shell: 1,418,441 -> 1,420,792 bytes (+2,351).

## Evidence

- `tests/scene-insights.test.cjs`: soundness walk over every official scene through a Proxy that
  throws on `solution` access; floor of 35 of 43 non-silent fresh scenes and 58 walked steps; hand
  fixtures for the row rule, the column rule, pair-clue pruning, the zero-candidate conflict, the
  accusation pointer and the missing-helper `null`. Seven of the eight tests fail against
  `origin/main`'s `src/insights.js` (the eighth is the `null` case, which also holds there).
- `node --test tests/scene-insights.test.cjs tests/insights.test.cjs tests/budget.test.cjs
tests/asset-catalogue.test.cjs` after `node tools/build.cjs`: 31 pass, 0 fail.
- `tests/budget.test.cjs` shell ceiling raised +1,088 bytes (17 x 64) over the 1,055.68-byte excess,
  leaving 32.32 bytes; comment cites #846. Other open PRs (#836) also touch this ceiling and will
  need a trivial rebase of that line.
- `npx prettier --check` on every changed file; `git diff --check`.

## Limits

- Not run: browser suites (no `.venv`), `npm test`, `npm run verify`, a physical phone. No browser
  test asserts the scene generic tip (searched), so none was changed.
- Hints are as sound as the player's placements: they follow from the board and clues, so a wrong
  placement can yield a hint that is consistent with it ("Revisit a conflict" appears only when a
  person runs out of squares). The accusation pointer is shown whenever everyone is placed and no
  clue is broken, even if the player has not yet picked a suspect.
- Message-only row/column hints highlight nothing on the board; the app only highlights aquarium
  cells.
- The 8 remaining silent scenes are not explained by one-step pruning; their cause was not analysed.
- Witness statements and alibi files (dossiers) remain for later slices of #846.
