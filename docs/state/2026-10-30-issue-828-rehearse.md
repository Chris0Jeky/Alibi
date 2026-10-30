# Scene Maker Rehearse (issue #828)

Branch `claude/rehearse-828`, stacked on `claude/clue-audit-833`.

## Changed

A `Rehearse` button beside `Add & play` (enabled only when `draftVerified && !draftBusy`). It builds
an in-memory run from a clone of the draft (`newRun`, now shared with `getRun`), keeps it in a
module-level `rehearsal` (never in `records`) and opens the ordinary play route at `#/play/<key>`.
`loadRoute` plays that object when the route key matches and drops it on any other route, so a
reload or navigation simply forgets it. Nothing is ever stored.

Neutralised write paths: `enqueueSave` (every board save, timer, pause, pagehide and note save
funnels through it) returns early; `savePreferences` resolves without writing (lesson close,
favourite); the automatic first-play lesson is skipped; the cross-tab `saved` message is only sent
from the save path; `AlibiJourney` (every Pulseboard journey, hint, fail and complete event) returns
early for a rehearsal run. The run is not in `records`, so the journal, stats and library never
see it. The round Back button, the mobile Back, the banner button, `Another puzzle` and the
completion dialog all return to `#/workshop` and scroll to the editor, whose `draft` is untouched.
Banner: "Rehearsal · nothing is saved"; the save chip, completion facts and end-of-puzzle copy say
the same instead of "Saved".

## Verified

- `tests/workshop-rehearse.test.cjs` (5 tests, new) slices the real play, save, hint, undo and exit
  functions out of `app.js` and runs them against a counting `store` Proxy, an `indexedDB` opener,
  a `localStorage` setter, the cross-tab channel and the real Pulseboard host. A full rehearsal
  (start, five placements, check, undo/redo, reveal, pause, accuse, completion, preference save, both
  exits) makes zero calls of any kind and the draft deep-equals its pre-rehearsal value. A control
  runs the same journey on an installed run and shows saves, preference writes, channel messages and
  `puzzle.completed`. Removing the `enqueueSave` guard, the `savePreferences` guard, the host guard
  or the `nextPuzzle` exit each fails the main test.
- `tests/deferred-route.test.cjs` (+1, 8 total; harness gained `rehearsal=null`): the real
  `loadRoute` plays the rehearsal object, creates no run or record, drops it on `#/workshop`
  (editor scrolled to) and does not revive it on re-entry. Deleting the drop or the `re ?` branch
  fails it.
- Focused run `workshop-*`, `scene-*`, `budget`, `deferred-route`, `completion-hooks`,
  `journey-restart`, `official-deferred`, `pulseboard-host`, `app-cabinet-export`,
  `asset-catalogue`: 323 tests, 322 pass; the one failure (`workshop-delivery`, Android payload)
  needed `dist-android/`, and passes (5/5) after `npm run build:android`.
- Prettier on changed files; `git diff --check`; `python -m py_compile` on both browser files.
- Build: precached shell 1,428,315 -> 1,429,342 (+1,027); documented ceiling raise to
  1.32 MiB + 45,248 (excess 997.68, leaves 26.32). JavaScript gzip 133,387 (ceiling 135,808) and
  startup/content limits unchanged. `catalogue.json` refreshed.

## NOT verified

- `tests/browser_ui.py` (new seed-7 journey: keyboard Rehearse, one placement, banner, Back, draft
  title and clue count unchanged, counts unchanged, zero IndexedDB writes via patched
  `put/add/delete/clear`) and the `rehearsal` scenario in `tests/browser_origin.py` (real IndexedDB,
  390px phone, before/after rows of `runs`, `packs` and `workshop-draft` equal) were compiled only,
  not run.
- No physical-phone or visual inspection of the 390px Scene Maker action row.

## Residual risk

- The hash change to `#/play/...` still counts one anonymous Pulseboard `puzzle` route view when the
  player has consented to counts, like any navigation; no puzzle id or journey event is sent.
- Pausing or toggling assistance inside a rehearsal uses the existing Club and room settings, which
  persist by their own explicit controls; a rehearsal does not write them itself.
- A lesson opened by hand during a rehearsal updates `prefs.seen` in memory only; it is written by
  the next real preference save.
- A rehearsal of a draft whose key equals an installed pack's puzzle would not collide in storage,
  but another tab saving that same key would show the existing cross-tab warning.
