# Author puzzles and casebooks

## Three kinds of extension

A new scenario for an existing family is data. A new crime-scene layout can be made in the visual workshop. A new family requires engine, solver, validation, rendering and teaching work. There is no arbitrary executable plugin import.

`examples/twelve-families.json` contains one valid, solver-checked example for each family. IDs are prefixed `example-` so this pack can be imported alongside the starter collection. They are deliberately copies for learning the format, not twelve additional original puzzles. `examples/scene-editor-start.json` is a separate editable case with its own ID. Rename both pack and puzzle IDs before making another imported collection.

```sh
node tools/validate-pack.cjs examples/twelve-families.json
```

`schemas/pack.schema.json` documents the broad structural envelope for editor tooling. Cross-field lengths, geometry, clue semantics, fixed values, solution validity and uniqueness are enforced by the executable validators/solvers. A JSON-schema pass alone does not certify a puzzle.

## Shared envelope

```json
{
  "schemaVersion": 1,
  "id": "my-mystery-pack",
  "version": 1,
  "title": "Small mysteries",
  "author": "Your name",
  "puzzles": []
}
```

Use 1–150 puzzles per pack, up to 3 MB for UI imports. IDs begin with a lowercase letter and contain lowercase letters, digits or hyphens, 2–64 characters. IDs such as constructor/prototype are rejected. Each puzzle requires `id`, `revision`, `type`, `title`, `subtitle`, `difficulty`, `size`, `solution` and its family-specific fields. Difficulty is Gentle, Steady or Tricky. Use plain text. Imported strings are escaped; no HTML, JavaScript or remote asset loading is supported.

Arrays representing grids are row-major. Index is `row * size + column`, with row and column zero-based in JSON. Display labels are rows 1…N and columns A…N. Thus on a 5×5 board, row 2 column C is index 7. Definitions and solutions use these indices, not displayed coordinates.

## Family formats

### Crime scenes: `scene`

Size 5. `roomNames` names four rooms; `rooms` assigns a room index to each square. `people` contains five objects with id/name/role/color. `victim` references one person ID. `objects` contains blocked squares, each `{cell,kind,name}`; supported illustrations are plant, table, piano, shelf and lamp. `solution` maps every person ID to a cell.

Clues reference `who`. `room`, `notRoom`, `row` and `col` use numeric `value`; `near` uses a furniture cell index. `edge` and `notEdge` have no extra value. `left`, `above`, `sameRoom` and `differentRoom` use another person ID in `other`. Left/above are comparisons, not necessarily adjacent; near means orthogonal adjacency. Use the generated clue text, or revise both the rule and displayed text together. The victim must share a room with exactly one suspect, independently of the row/column uniqueness rule.

The workshop generator creates a constrained valid draft. Its visual editor paints rooms, edits room names, adds/removes furniture and builds/removes clues. Room edits invalidate verification. Verification requires each painted room to be connected and recomputes the solution from the current rules. Zero solutions requires relaxing/correcting constraints; multiple solutions requires another reliable clue or constraint. An old author solution shown after an edit is explicitly labelled as the last verified arrangement. Do not publish it without reverification.

The editor supports the listed relational/location clues, not every conceivable detective mechanic. Keep stories brief and mechanically consistent. Murderer identification is a final deduction from a fully reconstructed map, not a timed guessing minigame.

### Alibi files: `dossier`

Size 4, four distinct `people` strings. Exactly two categories, each `{name, values:[four distinct strings]}`. Category 0 is a room and category 1 an object in current clue grammar. `solution` has eight indices: four room assignments followed by four object assignments, both in person order. `targetItem` is the object index identifying the culprit.

Clues `eq`/`ne` use `{kind,cat,who,value}`, with category/person/value indices. `link` uses `{kind:"link",a:roomIndex,b:objectIndex}`. The runtime state is two YES/NO/unknown matrices; automatic crossing is a user preference, not a different rule set. Completing both permutations is necessary before an accusation; duplicate YES marks cannot bypass that check.

### Witness statements: `witness`

Four distinct `people`, `trueCount`, `statements`, and integer culprit `solution`. Each statement has `speaker`, `kind` and `suspects`: `is` or `not` names one suspect index; `oneof` names two distinct indices. A speaker is a label, not an additional suspect. Exactly one listed suspect is guilty, so oneof has a straightforward inclusive logical meaning without two guilty suspects. Every statement refers to the same event. Do not introduce an unreliable narrator outside these rules.

### Sudoku: `sudoku`

Grid sizes 4, 6 or 9, `boxRows * boxCols === size`. `givens` uses 0 for empty and the normal digits for fixed clues; `solution` is the full number grid. All rows, columns and boxes contain every digit once. Copy a supported-size example rather than assuming arbitrary box dimensions are supported.

### Picture logic: `nonogram`

Square 5×5 or 7×7 starter examples. `rowClues` and `colClues` are arrays of run-length arrays. `[0]` denotes an empty line. `solution` is a 0/1 fill grid. State uses -1 unknown, 0 crossed, 1 filled. Completion depends on the filled pattern, not crossing every blank. Give the puzzle a title that does not accidentally spoil a mystery reveal unless that is intentional.

### Sun & moon: `binary`

Even-size square board. Starter puzzles use size 6. `givens` uses -1 empty, 0 sun, 1 moon; `solution` uses 0/1. Equal totals, no three consecutive same symbols and distinct completed rows/columns are all enforced. An alternative binary variant without the uniqueness rule needs a separate ruleset, not misleading clues.

### Futoshiki: `futoshiki`

Number grid with `givens`/`solution` and `inequalities:[{a,b,op}]`. `a` and `b` are orthogonally adjacent cells; `op` is `<` or `>`, interpreted as value at a relative to value at b. There are no Sudoku boxes. The renderer inverts/rotates the displayed sign where needed. Starter size is 5.

### Lanterns: `lightup`

`walls` has -2 for white floor, -1 for an unnumbered wall, or 0…4 for a numbered wall. `solution` is a 0/1 bulb grid with zero at walls. Saved state uses -1 at blocked cells and -1/0/1 on floor. A cross excludes a bulb but does not block light. Beams may cross. Bulbs may not directly illuminate each other.

### Tents & trees: `tents`

`trees` lists fixed tree cell indices. `rowTargets`/`colTargets` count tents. `solution` is a 0/1 tent grid. Runtime tree cells remain -1, not grass. The checker requires a valid one-to-one matching between tents and trees. A tent touching two trees is not automatically invalid if a distinct matching exists. Tents cannot touch at corners or edges.

### Aquariums: `aquarium`

`tanks` gives each square a contiguous tank ID from zero; each tank must be connected. Up to ten tanks are supported. `rowTargets`/`colTargets` count filled water squares. `solution` lists one level per tank: 0 empty, 1 bottom occupied row of that tank, 2 bottom two rows, etc. This is not a per-cell solution grid. Uneven shapes still fill all cells at a chosen tank height and below.

### Signal paths: `network`

`tiles` contains connector bitmasks: north 1, east 2, south 4, west 8. Add bits for multiple connectors. `source` is the source cell; `locked` lists nonrotatable tiles. `solution` lists clockwise quarter-turns 0…3 from each supplied tile. Locked tile solutions must be zero. All connectors must meet a reciprocal neighbour, remain inbounds and form one connected network. Symmetric rotations are equivalent arrangements and are deduplicated by the solver.

### Number trails: `trail`

`givens` uses 0 empty and fixed numbers 1…size². `solution` is the complete Hamiltonian number grid. First and last values are fixed in definitions. Consecutive values share an edge, never only a corner. Starter sizes are 4 and 5. This is a constrained path puzzle, not free drawing or a maze with unused squares.

## Publish content to everybody

A local import changes one browser, not the website. To publish an official puzzle, add its validated definition to `content/catalog.json`, preserve all published IDs/revisions, run build/tests, and upload the entire release to the existing production project. `npm run generate` reconstructs the seeded starter catalogue; it is a development tool, not the normal publishing command. Do not run it over a hand-edited published catalogue casually.

Casebooks live in `content/casebooks.json`. Each has id/title/tagline/setting/intro/ending/color/icon and chapters with `{id,name,brief}`. Chapter IDs reference catalogue puzzle IDs. The current UI unlocks the next chapter after completing earlier chapters, and shares puzzle completion with the main library. The existing casebooks are anthologies; do not claim that incidental story names from separate puzzles form a tightly continuous plot.

## Acceptance for every authored puzzle

Validate definition, confirm exactly one solution, solve manually without reveals, check that clue text matches the rules, and test at 360 pixels. A proof of uniqueness is not proof of an enjoyable deduction path. Get another human to solve it and record where they become confused. Calibrate difficulty from deduction complexity and real completion behaviour, not just the solver's search-node count.
