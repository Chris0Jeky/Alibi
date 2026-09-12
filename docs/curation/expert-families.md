# Provisional Expert family pack

`content/extra/expert-families.json` initially added one original Expert candidate to each family
that did not yet have an Expert entry. That v1 addition was additive. The current pack retains
those stable IDs and includes two explicit revision-2 corrections: `expert-aquarium-01` corrects
its guidance to seven reservoirs without changing its board, targets or solution, while
`expert-nonogram-01` replaces its original constellation picture and clues with the Bellweather
beacon. Saved revision-1 runs retain their stored definitions. Every current entry carries
`difficultyStatus: "provisional"` and a short `difficultyEvidence` note; human sampling is still
needed before the label becomes a calibrated difficulty claim.

| Family    | Puzzle                |       Size | Intended pressure                                                                  |
| --------- | --------------------- | ---------: | ---------------------------------------------------------------------------------- |
| Scene     | `expert-scene-01`     |        5×5 | Room, furniture, row and column constraints converge on the shared-room deduction. |
| Dossier   | `expert-dossier-01`   |        4×4 | Indirect links and exclusions place every non-key object before the target remains. |
| Witness   | `expert-witness-01`   | 4 suspects | Five mixed statements must be tested against one exact true-count.                 |
| Nonogram  | `expert-nonogram-01`  |      15×15 | Lantern, tower, beam and shoreline runs form the Bellweather lighthouse.           |
| Lightup   | `expert-lightup-01`   |        6×6 | Numbered walls and overlapping visibility corridors force lantern placement.       |
| Tents     | `expert-tents-01`     |        5×5 | Line totals, diagonal no-touch exclusions and tree matching interact.              |
| Aquarium  | `expert-aquarium-01`  |        6×6 | Irregular tank levels are narrowed together by row and column totals.              |
| Network   | `expert-network-01`   |        6×6 | Edge-safe rotations must satisfy local joins and one connected signal.             |
| Trail     | `expert-trail-01`     |        5×5 | Sparse anchors use distance parity and forced neighbours late in the path.         |
| Binary    | `expert-binary-01`    |        8×8 | Half-filled distinct lines and no triples create chained deductions.               |
| Futoshiki | `expert-futoshiki-01` |        7×7 | A larger Latin square combines givens with a long adjacent inequality chain.       |
| Bridges   | `expert-bridges-01`   |        9×9 | A 3×3 loop mixes empty, single and double routes; connectivity completes the chain. |

The focused runtime check is:

```text
node --test tests/expert-families.test.cjs
```

Run the independent checker before treating the pack as publishable:

```text
python tools/curation/independent_check.py content/extra/expert-families.json --out test-results/expert-families-independent.json
```

That checker counts semantic solutions without importing Alibi's JavaScript solver. Uniqueness is
necessary for release, but playtesting must still confirm that each puzzle earns its Expert label
and has a fair deduction path.
