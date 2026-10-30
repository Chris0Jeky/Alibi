# Techniques in the completed record (#835, slice 1)

## Scope

- `src/insights.js`: `techniques(p)` walks the reasoning hints from the puzzle's fresh board,
  applying only applicable steps (single-cell values, Alibi-file marks, scene placements), and
  counts each rule name. Corrections and message-only nudges end the walk. Never reads
  `solution` (Proxy test over every official puzzle).
- `src/app.js` `reviewRecord()`: after the recap, one line "Techniques the hints use here: …"
  when the walk named any technique. The 13 `src/app.js` lesson receipts are refreshed.
- Stacked on #856 (its budget raises); land after it.

## Evidence

- `tests/techniques.test.cjs` (3): `sudoku-04` names both Sudoku techniques; trails, Alibi files,
  scenes and Picture logic never list a correction; every official puzzle summarises with the
  answer hidden. Two fail on the previous `src/insights.js` (no `techniques`).
- After build: budget (shell +588; ceiling +640 leaves 103.32 bytes), insights-delivery (chunk
  7,077 of 7,168 gzip), asset-catalogue, dossier/witness, hint-reach pass.
- Built app: solving `sudoku-04` and opening *Review the record* shows "Techniques the hints use
  here: Only one number fits (24), Only one place for a number (2)."

## Limits

Counts reflect one deterministic hint walk, not the player's own route. Families whose hints place
nothing (bridges, aquarium, network, witness) show no line. "Practise this technique" lists (the
rest of #835) are not built.
