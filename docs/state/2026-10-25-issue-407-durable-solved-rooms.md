# Durable Archive Heist and Lantern Gardens solved markers (#407)

Branch `sol/ex-alibi-11`, 2026-10-25. Unreleased.

## Change

The Club journal keeps the newest 100 records across every Games Room game. Archive Heist room
ticks, the `n/9` and `n/24 solved` counts, the room 33 end card, the "In good order" stamp and the
Lantern Gardens "Solved" labels were all derived from that journal, so 100 later games (for
example Tic-Tac-Toe rounds) faded them.

`record()` in `src/club.js` now copies every `archive:<room>:` and `regiongardens:<garden>:` record
id prefix into an optional Club save field, `cleared`, before it prunes the journal. One helper,
`cleared(prefix)`, reads that set plus the remaining journal. `src/backup-validation.js` accepts
the field when absent (older saves), and otherwise requires an array of at most 200 canonical
prefixes, exactly the set `record()` can produce, so a crafted import cannot make the next save
unloadable. Schema stays 1; database version, puzzle revisions and app version are unchanged.
Older builds keep the field because they store the validated object whole.

Budgets: JS gzip 134,935 -> 135,053 and shell 1,416,422 -> 1,416,951 on this base. Ceilings raised
+128 / +544 with the measured note in `tests/budget.test.cjs`; no feature room left.

## Evidence (Windows host, local Chromium)

- `npm run verify`: format, web + Android build, 2,026 Node tests, 2,008 pass, 0 fail, 18 skipped.
- `tests/club-solved-durable.test.cjs` (new): 3/3 pass; 0/3 against origin/main sources.
- `tests/browser_archive_vaults.py`: 133 checks pass, including the new desktop step that plays
  100 distinct Tic-Tac-Toe games through actual controls and confirms `1/9`, `24/24` and the
  room 10 tick survive. Against origin/main sources it fails at "solved counts survive the journal cap".
- `browser_club.py` 118, `browser_tic_tac_toe.py` 25, `browser_ui.py` 188,
  `browser_region_gardens.py` 250 and `browser_backup_import.py` 23 checks pass (the last two
  against `tools/serve.cjs` on a local port).

## Not verified

- Saves whose archive records were already pruned before this build cannot regain their ticks;
  replaying the room restores them.
- Hosted origins, Android and physical phones were not exercised.
- Lantern Duel and Pocket Borough stamps still read the capped journal (separate follow-up).
