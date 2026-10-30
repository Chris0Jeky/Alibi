# Scene hints name the whole clue chain (#851)

## Scope

- `src/insights.js` scene branch: when a pair clue narrows a person using another person's
  candidates, the explanation now also names the clues that narrowed that other person (their
  own single-person clues and the pair clues behind them). The list is no longer truncated at
  three, so the decisive clue cannot drop out. Only the message changes; candidates and placements
  are as before.
- `tests/scene-insights.test.cjs`: the pair-clue fixture asserts Ben's pinning clue is named; a new
  test checks hints on partial official scenes (each person left out in turn, and every second
  person left out) never report a conflict, every person hint matches the solution, and every
  row/column hint includes a missing person's true square.
- `tools/curation/runtime_check.cjs` loads `src/assist.js` when present, as the app does, so
  curation runs see the same scene hints.

## Evidence

- `node --test tests/scene-insights.test.cjs` 9/9; the chain assertion fails on the previous
  `src/insights.js`. The partial-board test is new coverage (passes on both).
- After `npm run build`: budget, insights-delivery, hint-reach, all insights suites and
  asset-catalogue pass (84 tests). `node tools/curation/runtime_check.cjs . content/curation/packs/scene.json`:
  16 reducer replays passed.

## Limits

The chain is an over-approximation (every clue that narrowed a contributor), so long chains read
as a list of eight clues on the hardest boards; they sit behind *Show the step*.
