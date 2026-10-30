# Hint reach as a measured floor (#826)

## Scope

New `tools/hint-reach.cjs` and `tests/hint-reach.test.cjs`. No shipped code changes.

`node tools/hint-reach.cjs` walks every official puzzle (trusted registry, uniqueness checks off)
from its fresh board through the reasoning Hint (`src/insights.js` plus the bridges and network
hint modules) and prints, per family, the boards that get only the generic tip ("silent"),
the boards hints alone complete, and the median share of open squares hints place.
`--silent` lists the silent puzzles; `--json` prints the table. The solution is read only to score
the walk; hints never see it differently from the app.

## Measured on main aeb6656e

```
family      boards  silent  solved-by-hints  median-reach
scene           43      43                0             -
sudoku          49      21               16            7%
nonogram        40       0               37          100%
binary          55       0                7           36%
futoshiki       51      27                1            0%
dossier         29      29                0             -
witness         31      31                0             -
lightup         52       2                0           51%
tents           44       0                0           78%
aquarium        44       0                0             -
network         44       0                0             -
trail           44      44                0            0%
bridges         44       0                0            0%
```

Bridges, aquarium and network hints explain without a single-cell value, so their reach is
not walked. Crime scenes, alibi files and witness statements offer no reasoning hint at all (#846).

## Evidence

`tests/hint-reach.test.cjs` pins each family's silent count as a ceiling and the Picture logic
completion count as a floor (15 tests, ~2 s). Lowering the Lanterns ceiling to 1 fails the test.

## Limits

Floors reflect main before #819/#836; tighten them as those land. Silent counts do not judge
hint quality or wording.
