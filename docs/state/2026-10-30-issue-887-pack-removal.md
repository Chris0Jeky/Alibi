# 2026-10-30 issue #887: remove a locally added pack, plain offline Add message

Branch `claude/pack-removal-887`, based on `05f42df2` and merged with main at `b197421e` (#886).

## Changed

- `Store.removePack(id)` (`src/storage.js`), modelled on `addPack`: one `packs`-only readwrite
  transaction deleting the record; session mode deletes from `memory.packs`; localStorage fallback
  refuses ("Removing packs requires IndexedDB. Existing local data is unchanged."), as adding does.
  It never opens the `runs` store, so saved runs cannot be touched. Removing an absent pack is harmless.
- Workshop "Puzzle packs" list (`src/app.js`): each custom pack row gets a `Remove` button
  (`aria-label="Remove <title>"`). It opens a confirmation naming the pack and its puzzle count,
  saying saved progress is kept and the pack can be added again. `Remove pack` removes the record,
  filters the in-memory `packs`, closes the dialog, re-renders and moves focus to the first remaining
  Remove button, or to "Choose a JSON pack" when none is left. Cancelling returns focus to the
  opener. Official packs never get the control (only `packs.slice(1)` renders rows). A failed
  removal closes the dialog and toasts the error through the existing action handler.
- No cross-tab broadcast: `addPack` does not broadcast either. Another open tab keeps its old
  catalogue until reload; a stale tab removing an already-removed pack is a no-op.
- Saved runs are kept and still load. A run carries its own puzzle definition, and the `#/play` route
  prefers the pinned run over the catalogue, so a run whose pack is gone opens, the Journal card
  links to it, and Settings export and the backup still include it (verified in the browser).
  Favourites for removed puzzles are filtered by `all()` and simply stop showing.
- `.pack-row` wraps its actions on narrow screens (320 px overflowed with two buttons).
- Offline adder (`tools/workshop-entry.cjs`): the generated `collections` action catches a failed
  `import()` of the optional adder chunk and rejects with "Adding a collection needs a connection.
  Reconnect and try again." instead of the raw module error. `tests/workshop-shelf.test.cjs` pins
  the new generated line.
- Tests: three `Store.removePack` tests in `tests/workshop-install.test.cjs` (the fake IndexedDB gains
  `delete`); `tests/workshop_add_browser.py` gains two cases per width (adder chunk aborted by a
  route; import `examples/twelve-families.json`, play a binary puzzle, remove through the real
  confirmation incl. cancel and focus, runs byte-identical, run reopens, backup carries it, re-import
  accepted, remove again). Expected checks 24 -> 28.
- Budgets (`tests/budget.test.cjs`), measured against main `b197421e`: startup gzip 134,777 ->
  135,011 (+234), ceiling 127 KiB + 4,800 -> 4,992 (78 x 64), 29 left; precached shell 1,440,408 ->
  1,441,780 (+1,372), ceiling 1.32 MiB + 56,320 -> 57,728 (902 x 64), 68.32 left. Catalogue
  regenerated with `node tools/assets/catalogue.cjs`.

## Verified

- `npm run format:check` clean; `npm run build:android` clean tree.
- `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: 2,504 tests, 2,482 pass,
  0 fail, 22 skipped.
- Built origin on port 18887 (headless Chromium, real service worker and IndexedDB):
  `tests/workshop_add_browser.py` passed (28 checks); `tests/browser_origin.py` 665 checks passed;
  `tests/browser_ui.py` 287 checks passed.
- Mutation proofs: with `src/storage.js` reverted to main the three storage tests fail and the browser
  check fails at the removed-row assertion; with `tools/workshop-entry.cjs` reverted to main the
  browser check fails waiting for the plain message (the raw "Failed to fetch dynamically imported
  module" toast appears instead, confirmed by hand). Both restored.
- Screenshots inspected at 390x844 (touch) and 1280x900: pack row and confirmation dialog; 320 px
  row has no horizontal overflow (`test-results/pack-removal-887/`, ignored).

## Review fold-in and final measurement

Two-lens review (Sonnet reviewer, Opus deep-reviewer): SHIP, no CRITICAL/HIGH. Folded in: in IndexedDB mode a backup lists only stored packs, so a tab that missed another tab's removal cannot write the removed pack back into a backup that would then fail validation (`tests/backup-route-race.test.cjs`; reverting the filter fails it); the confirm handler refuses an id this tab does not list as a local pack. LOWs tracked in #889.

Re-measured on main after #888: startup gzip 135,029 -> 135,328, ceiling 127 KiB + 5,312 (83 x 64), 32 left; shell 1,441,109 -> 1,442,612, ceiling 1.32 MiB + 58,560 (915 x 64; 914 x 64 would leave 4.32), 68.32 left. These replace the entries above.

## NOT verified

- Physical phone, screen reader, and the hosted Cloudflare/Sites origins.
- A true offline reload with the adder chunk uncached (the chunk failure was simulated by aborting
  its request, not by airplane mode).
- Removal in the localStorage fallback (unit-tested refusal only) and cross-tab behaviour beyond the
  existing stale-tab semantics.
- The UI part of the browser check was not separately mutated by removing the Remove button.

## Residual risk

- Another tab keeps a removed pack in its catalogue until reload (same as adding).
- If main moves again, `tests/budget.test.cjs` and `assets-source/library/catalogue.json` need a
  re-measure on merge.
- The separate LOW items in the issue (illegal Club `tictactoe` restore hint, Quiet Wing tab label
  wrapping at 390 px) are not addressed here.
