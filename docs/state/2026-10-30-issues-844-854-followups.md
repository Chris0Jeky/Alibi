# 2026-10-30 Scene Maker follow-ups: #844 and #854

Branch `claude/scene-followups-844-854`, based on `origin/claude/compose-wave2-20261030`.
Not pushed; no PR opened.

## Changed

- #844 budget refusal: when verification proved zero arrangements and diagnosis then exhausts
  the shared 250,000-node ceiling, the validator worker refuses with "No arrangement fits, and the
  conflicting clues could not be identified within the search limit." (no advice to add clues). The
  audit's existing budget refusal and this one share one `bounded()` helper. Verification
  exhausting first keeps the solver's message.
- #844 accessible names and copy: each clue's remove button is named "Remove clue N"; a one-clue
  conflict reads "This clue cannot hold with this floor plan".
- #854 cross-tab: a `saved` message for the rehearsal's own key no longer sets `saveError`.
- #854 backup: `cabinetBackup` no longer stamps rehearsal seconds on an installed run of the same
  key (`!current.rehearsal` guard).
- #854 copy and edges: the review-record dialog's exit says "Back to the editor" during a
  rehearsal; a shared `locked()` helper lets a rehearsal ignore a pre-existing `saveError` or
  `storageFatal` in `blocked()`, `undo()`, restart, notes and drag painting (it never writes).
  Normal play is unchanged.
- `tests/budget.test.cjs`: startup gzip ceiling 127 KiB + 3,520 -> 3,552 (133,538 -> 133,579,
  excess 11, leaves 21); shell ceiling 1.32 MiB + 45,696 -> 46,016 (1,429,765 -> 1,430,091, excess
  274.68, leaves 45.32). No feature room. `assets-source/library/catalogue.json` refreshed.

## Verified

- `node --test tests/scene-*.test.cjs tests/workshop-*.test.cjs tests/budget.test.cjs`: 261 of 262
  pass; the one failure is the Android payload test, which needs `dist-android/`. Also
  `tests/app-*`, `save-update`, `backup-*`, `validator-*`: 136 of 136.
- Each new test fails without its fix: the two budget-refusal tests against the old worker; the
  remove-name and heading tests against the previous `app.js` (via `ALIBI_APP_SOURCE`); the four
  rehearsal tests against `app.js` with that one guard removed (each mutation failed exactly its own
  test).
- `npm ci`, `npm run build`, Prettier check on every changed file, `git diff --check`.

## NOT verified

- Browser suites (`browser_ui.py`, `browser_origin.py`); no assertion there matches the old
  "Remove clue" name, but they were not run locally.
- Physical device and real screen readers (HUMAN_TODO q-2). "Save & update" still discards
  rehearsal progress silently (third #854 item, left as is: nothing is stored to lose).

## Residual risk

Low. `locked()` now also covers restart, notes and drag painting for rehearsals; those paths never
write for a rehearsal. The cross-tab guard returns before refreshing `records` for the colliding
key, which the non-rehearsal path also does not do.
