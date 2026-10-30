# Issue 877: Workshop draft integrity

Branch `claude/workshop-draft-877`, based on `origin/main` b577ce41 (#874). Not pushed, no PR.

## Changed

1. **Cross-tab draft overwrite (HIGH).** `src/storage.js` adds `Store.saveDraft(value,
   expectedRevision)`. Inside one `meta` readwrite transaction it reads `workshop-draft` and writes
   only when the stored revision is the one this tab loaded or last confirmed, or when the stored
   record was written by this same Store (`tab`, a random id per page load). The second rule lets
   a tab's own edits follow each other before earlier writes confirm: `saveDraft` still issues the
   write synchronously per edit, as before, so IndexedDB order and clone-at-`put()` are unchanged.
   Anything else raises the existing `ConflictError` and writes nothing. Records are
   `{ puzzle, rev, tab }`; `AlibiStorage.draftRevision` reads a missing or invalid `rev` as 0, so
   drafts saved before this change load and are never erased. `alibi-device` stays version 1.
   Fallback modes (localStorage/session) compare and then write without a transaction.
   `src/app.js`: `draftRev` is loaded at startup and advanced on each confirmed save, which also
   posts `{type: 'draft', rev}` on the existing `alibi-saves` channel. A conflict, a newer
   broadcast revision, or another tab's `restored` message sets `draftStale`: the draft stays in
   memory, the editor shows a `role="alert"` notice ("changed in another tab ... Export draft to
   keep it, then reload"), a toast appears once, autosave stops, and Cabinet backup refuses
   (`draftSave` rejects) instead of exporting the other tab's draft as this one. Export draft stays
   enabled. Restore now compares local and backup drafts by `puzzle`, so the save token does not
   produce a false "drafts differ" note; `backup-validation.js` still keeps only `puzzle`.
2. **Generate discarded edits (HIGH).** `generateDraft` pushes a clone of the replaced draft onto
   `draftUndo` (50-entry cap, as `recordDraft`) and clears Redo; with no previous draft, as before.
3. **Form typing cancelled Verify (MEDIUM).** The `#scene-form` input handler bumps a new
   `makerEpoch`; `generateDraft` checks it as well as `draftEpoch`; Verify, Audit and import use
   only `draftEpoch`.
4. Tests. New: four draft CAS cases in `tests/storage-restore.test.cjs` (two Stores on one fake
   database: stale tab refused and nothing overwritten, legacy draft = revision 0, own unconfirmed
   saves, localStorage fallback, restore of an identical draft with a token); a conflict case in
   `tests/backup-route-race.test.cjs` (no second write, backup refused); the Verify-survives-typing
   case in `tests/workshop-ownership.test.cjs`; the Generate-onto-Undo assertion in
   `tests/workshop-history.test.cjs` (replaces the old "generation clears both branches"); the
   `workshop_draft_cross_tab` scenario in `tests/browser_origin.py` (two real tabs; tab B has no
   BroadcastChannel so only the IndexedDB CAS protects tab A). Fixtures that slice `saveDraft` or
   `generateDraft` now declare the new variables and stub `store.saveDraft`; `browser_ui.py`
   accepts the `rev`/`tab` fields.
5. Budgets (`tests/budget.test.cjs`), base b577ce41, final branch on main after #876 (includes the
   review fold-in): startup gzip 134,462 -> 134,748 (+286), excess 220, ceiling 127 KiB + 4,736
   (74 x 64) leaves 36; precached shell 1,438,967 -> 1,440,155 (+1,188), excess 1,122.68, ceiling
   1.32 MiB + 56,064 (876 x 64) leaves 29.32. No feature room. Catalogue receipt regenerated.

## Verified

- Mutation proofs (each change reverted in turn, focused tests run, source restored):
  CAS check removed -> 3 storage tests fail; tab rule removed -> "own unconfirmed saves" fails;
  restore compare back to whole record -> "same draft ignores the save token" fails; Generate back
  to `draftUndo = []` -> the history test fails; form input back to `draftEpoch++` -> the Verify
  test fails; stale guard removed from `saveDraft` -> the backup-route conflict test fails;
  CAS check removed and rebuilt -> browser scenario fails at "tab B shows the stale-draft notice".
- `npm run build:android` ok. After committing, `node --test --test-concurrency=2 tests/*.test.cjs
  tests/*.test.mjs`: 2482 tests, 2460 pass, 0 fail, 22 skipped (at 4067b4da; a first run on an
  older build failed only the Android source-SHA checks, which pass after rebuilding at HEAD).
- Served from this worktree on port 18877: `tests/browser_ui.py` 287 checks pass;
  `tests/browser_origin.py` full set 665 checks pass (includes the new scenario, 16 checks alone).
- Prettier on all changed JS.

## NOT verified

- A physical phone, and real cross-tab timing on mobile browsers.
- The fake IndexedDB in Node tests serialises transactions only when awaited; truly concurrent
  same-tab writes are proven by the IndexedDB ordering guarantee and the browser scenario, not by
  a Node test.
- The 50-entry cap on Generate's Undo push is shared code shape, not separately tested.
- `tests/browser_mobile_qa.py` and other browser suites were not run (they read only `.puzzle`).

## Review fold-in

The deep-review lens found that a stale draft made `cabinetBackup()` refuse, blocking the only
export of unsaved run progress (the restore broadcast sets both run and draft stale). Backups now
proceed past a stale-draft rejection with the device's stored draft and the runs; a real draft
I/O error still refuses. `tests/backup-route-race.test.cjs` asserts the export happens and carries
the stored draft; reverting the guard fails it.

## Residual risk

- Fallback storage (no IndexedDB) compares and writes without a cross-tab transaction.
- A backup-restored draft is stored without a revision (0). Open tabs are stopped by the
  `restored` broadcast; a tab that missed it and had no draft could still write over it.
- Behaviour change: any tab that hears another tab's draft save or restore stops saving its draft
  until reload, even if it was idle (the same model as runs).
- A damaged stored draft is still replaced by the first save, as before.
