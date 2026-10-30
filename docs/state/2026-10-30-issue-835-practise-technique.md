# Practise a technique (#835, slice 2)

## Scope

- `src/app.js` `reviewRecord()`: the technique names in the completed record become buttons
  ("Only one number fits (11)"). Choosing one closes the record and opens that family's collection
  filtered to puzzles whose hint walk uses the technique. Focus lands on the count line
  ("37 puzzles whose hints use Only one number fits"), which sits below the family art on a phone.
- `library.technique` is cleared by `clearFilters()`, so *Reset filters* and another family remove
  it. It is never set by any other control and is not persisted.
- Rehearsal drafts keep one id and revision while edited, so the record's counts can be stale
  for a re-rehearsed draft: that is the memo-key item of #865 (builder), not changed here.
- The filter reuses `C.insights.techniques()` (slice 1, memoised). No change to `src/insights.js`.
- The 13 `src/app.js` lesson receipts are refreshed.

## Evidence

- `tests/browser_ui.py`: after solving a Sudoku through the UI, the first technique button opens the
  Sudoku collection with focus on the count; the filtered count is above zero and below the
  unfiltered count. Measured: 37 puzzles use "Only one number fits".
- Budgets on main after #868: startup gzip 134,296 -> 134,438 (+142; ceiling +128), shell
  1,438,353 -> 1,438,888 (+535; ceiling +576). The reasoning chunk is unchanged.
- Review fixes: *practise* waits for deferred definitions before the first walk (the walk caches
  per revision, so a listing stub would otherwise cache an empty list), the filter skips any stub
  still unloaded, and the selected collection is cleared so the count means the whole family.
- Phone screenshots (390 x 844) of the record and the filtered list were inspected locally.

## Measured spread (one hint walk per official puzzle)

Techniques that split a family, and so make a useful practise list: Binary *Compare two squares* (8
of 55), Sudoku *Only one place for a number* (33 of 49), Trail *Only one number reaches* (7 of 44),
Scene *Only one square left* (26 of 43). Picture logic's two techniques are used by all 40 puzzles,
so its list equals the family.

## Limits

The first filter on a family walks every puzzle in it once on the main thread: about 0.7 s on a
desktop for Picture logic, under 0.25 s for every other family. Phones are slower; the code says
where to yield. Families whose hints place nothing (bridges, aquarium, network, witness) show no
techniques and so no buttons. Technique stays separate from difficulty.
