# 2026-10-30 issue #882: run-save integrity

Branch `claude/run-saves-882`, based on `f76fb3d1` (main after #878). Three defects found by the
review lens on the run-save path; the comment on the issue records that the `saved` broadcast
handler is not a defect.

## Changed

- Restore quiesces this tab (`src/app.js` `restoreBackup`). The restore clears `noteTimer` and flushes
  with `await enqueueSave(); await queue;` (the `cabinetBackup` pattern) before the restore snapshot
  is taken. `blocked()`, `commit()`, `undo()` and the notes input refuse while `restoreBusy`, the same
  way they refuse while `updateRequested`. A genuine other-tab write still trips `ConflictError` in
  `store.restore`; that path is unchanged.
- A damaged stored run is damage, not a conflict (`src/storage.js` `saveRun`). One `rowDamaged` check
  now serves the IndexedDB and session paths and rejects with `DamagedRecordError` (the stored record
  needs attention, it has not been deleted, export browser data first, the startup-quarantine wording).
  `ConflictError` is now only `old.rev !== expectedRevision`. The row is never written or deleted.
  `enqueueSave` already shows `e.message`, so the new text reaches the banner and toast with no
  `app.js` change. The session path used to report validator text for a failed `validateRun`; it now
  uses the same damage error.
- Paint strokes stop when play is frozen (`paintTo`, `endPaint`). A pause stops further cells; the
  cells painted before the pause are committed and saved as before. While an update is pending or a
  restore is running the stroke is rolled back to its start and nothing is saved (the existing
  `locked()` behavior). `apply-update` calls `endPaint()` before `pauseForUpdate(true)`, so an update
  still saves the stroke in progress.
- Tests: `tests/run-saves-882.test.cjs` (5 tests). `tests/storage-revision.test.cjs` expects
  `DamagedRecordError` for the nine damaged-row cases that used to expect `ConflictError`. Seven
  sliced-app fixtures declare `restoreBusy`, and `tests/backup-route-race.test.cjs` declares the
  restore flush's `noteTimer`/`enqueueSave`.
- Budget: precached shell 1,438,968 -> 1,439,129 (+161); ceiling 1.32 MiB + 54,912 -> + 55,040
  (860 x 64), leaves 31.32. Startup gzip 134,462 -> 134,484/134,485 (+22/23) stays under its
  127 KiB + 4,480 ceiling (134,528), 43 bytes left, so that ceiling is unchanged. The catalogue is
  regenerated.
- Re-measured after merging main (#879): startup gzip 134,754 -> 134,773, ceiling 127 KiB + 4,800
  (75 x 64; 74 x 64 would leave 11), 75 left; shell 1,440,158 -> 1,440,319, ceiling 1.32 MiB +
  56,256 (879 x 64), 57.32 left. These replace the entries above.

## Verified

- `npm run build:android` on the branch (clean tree), then
  `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: 2,493 tests, 2,471 pass,
  0 fail (the rest skipped by their own conditions).
- Mutation proofs, each reverted afterwards (tree clean):
  - Restore: removing the `clearTimeout`/flush and the `restoreBusy` check in `blocked()` fails
    `restore flushes this tab and refuses its own input before the snapshot` (1 fail, 21 pass across
    this file and `storage-revision`).
  - Damage: mapping the IndexedDB path back to `ConflictError` fails nine tests in
    `storage-revision.test.cjs` (the eight damaged-row cases and the wrong-envelope-key case).
  - Paint: removing the new guards in `paintTo`/`endPaint` fails all three paint tests.
- `prettier --check` on `src/` and `tests/` is clean.

## NOT verified

- `tests/browser_ui.py` and `tests/browser_origin.py`: skipped, the machine had 1.7 GB free and the
  brief requires 3 GB. No browser test exercises restore, pause or a mid-stroke pause, so none was
  extended.
- The note-input refusal while `restoreBusy` and the guards in `commit()`/`undo()` are covered by
  reading and by `blocked()`, not by their own test (they sit inside large listeners).
- Real two-tab IndexedDB behavior of the damage error (covered by the fake IndexedDB only).
- Physical phones, Firefox/Safari, screen readers (HUMAN_TODO q-2).

## Residual risk

- #879 (Workshop draft CAS) also moves the startup gzip and shell budgets. On a base with #879
  the gzip headroom (43 here) shrinks; whichever PR lands second must re-measure and may need its
  own raise.
- While `restoreBusy`, an arriving `pagehide` or lifecycle `enqueueSave` still runs; it hits the new
  revision floor after the restore and is rejected as a conflict, as before.
- The notes input shows the generic "Export this session or reload" toast if refused while a restore
  runs; the modal restore dialog makes that path unlikely.
