# Castle and Quiet Wing transfer reads (PR 579)

Branch: `fix/579-castle-quiet-reads`, stacked on `grok/al1-save-transfer`.

## Changed

**Castle (P2, `src/origin-transfer.js`).** `readCastle` takes `state` from `AlibiCastle.exportBackup()` but
`record` from the durable `chapter-one` row. When a notebook edit's IndexedDB write fails, the store keeps the
newer state in memory (mode `protected`) while the row still holds the older revision. `writeCastle` always
preferred `record`, so importing that file elsewhere wrote the older save and reported success.

Fix: `assertShape` (used by both export and import validation) refuses a Castle section whose `record.state`
revision differs from `state` revision, with "Castle has unsaved edits." The user exports the notebook
separately, as Castle's own protected-mode flow already asks. Chosen over making `state` canonical because that
would need an envelope-revision policy and would make the rollback compare (`sameAfterRollback`, a plain JSON
compare after the rollback write) disagree with the pre-import record. A coherent pair, a null record
(session mode) and a null state are unchanged. State revision is the engine counter and only moves forward
(`save` and `restore` both require an advance), so comparing it detects the divergence.

**Quiet Wing (P2, `readQuiet`).** `G.QWApp` is published on mount and never cleared, so after leaving Quiet Wing
its detached `state` outranked the committed `alibi-quiet-wing-v1/saves/state` record, and a second tab's newer
commit was exported stale. `G.QWApp` is also read by `activities.js` (challenge store and session-mode guards
after leaving), so it is not cleared. Instead `dispose()` sets `A.disposed`, and `readQuiet` uses the app state
only while it is mounted, then `G.QWRetainedState` (the unsaved state dispose keeps, the same source
`exportAll` uses), then the committed record. The raw fallback bytes under `FALLBACK_RAW` are unchanged.

## Evidence

- `tests/origin-transfer.test.cjs`: divergent Castle pair is refused by export and by a hand-built valid-checksum
  file. Red before the fix, green after.
- `tests/origin-transfer-quiet-fallback.test.cjs`: disposed app reads the newer committed record; retained
  unsaved state wins; a mounted app is still the live source; dispose source marks the app detached. Red before.
- Not a real mount: the dispose seam is checked on source text. The Python browser suites were not run.

## Budgets (2026-10-24)

Clean committed build: 138,569 application gzip (+47 over 138,522) and 207,911 initial code plus data gzip
(+50). Application ceiling +64 (22 left), initial ceiling +32 (24 left), not feature room.
