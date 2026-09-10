# Provisional Expert family pack

`content/extra/expert-families.json` adds one original Expert candidate to each family that
does not yet have an Expert entry. The pack is additive, so existing puzzle IDs and revisions are
unchanged. Every entry carries `difficultyStatus: "provisional"` and a short
`difficultyEvidence` note describing the intended deduction pressure; the label still needs human
sampling before it becomes a calibrated difficulty claim.

| Family    | Puzzle                |       Size | Intended pressure                                                                  |
| --------- | --------------------- | ---------: | ---------------------------------------------------------------------------------- |
| Scene     | `expert-scene-01`     |        5×5 | Room, furniture, row and column constraints converge on the shared-room deduction. |
| Dossier   | `expert-dossier-01`   |        4×4 | Two linked permutations and negative evidence leave the target item last.          |
| Witness   | `expert-witness-01`   | 4 suspects | Five mixed statements must be tested against one exact true-count.                 |
| Nonogram  | `expert-nonogram-01`  |      15×15 | Long and separated runs cross repeatedly between rows and columns.                 |
| Lightup   | `expert-lightup-01`   |        6×6 | Numbered walls and overlapping visibility corridors force lantern placement.       |
| Tents     | `expert-tents-01`     |        5×5 | Line totals, diagonal no-touch exclusions and tree matching interact.              |
| Aquarium  | `expert-aquarium-01`  |        6×6 | Irregular tank levels are narrowed together by row and column totals.              |
| Network   | `expert-network-01`   |        6×6 | Edge-safe rotations must satisfy local joins and one connected signal.             |
| Trail     | `expert-trail-01`     |        5×5 | Sparse anchors use distance parity and forced neighbours late in the path.         |
| Binary    | `expert-binary-01`    |        8×8 | Half-filled distinct lines and no triples create chained deductions.               |
| Futoshiki | `expert-futoshiki-01` |        7×7 | A larger Latin square combines givens with a long adjacent inequality chain.       |
| Bridges   | `expert-bridges-01`   |        9×9 | Degree counts, crossings and network connectivity constrain the final routes.      |

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
