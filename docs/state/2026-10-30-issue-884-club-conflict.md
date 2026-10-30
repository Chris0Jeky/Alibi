# 2026-10-30 issue #884 item 1: Club controls after a save conflict

Branch `claude/club-conflict-884`, based on `9a05c8b4` (main after #897). Items 2 (the localStorage
fallback) and 3 (the shared seed link) of the issue are untouched.

## Changed

- `src/club.js`: one `requireSavable()` guard. It throws "Resolve the save conflict or export before
  continuing." when `saveError` is set, the error is not the retryable Web Lock one, and
  `storageMode` is not `session`. That is the same condition `commitGame` already refuses on, so
  protected `session` mode (deliberately temporary, banner says so) is unchanged, and a retryable
  "another tab is saving" error still retries on the next save.
- The guard runs before any state change in: edition rotate and pin, Zen, assist, Undo and Redo,
  the Lantern Gardens level and Archive room else-branches (the confirm branches already hit the
  guarded `reset-confirm`), and the daily-town start and its confirm. The daily-town controls are not
  named in the issue; they replaced the town in memory and called `save()` the same way.
  The action handler's existing catch shows the refusal as a toast.
- `tests/browser_origin.py`: new `club_conflict` scenario (also added to `ORIGIN_SCENARIOS`). Two
  tabs on one real origin and profile; the tab opened first goes stale because booting the second
  bumps the revision. The second commits a Tic-Tac-Toe move; the stale tab's own move raises the
  conflict banner; then the real Undo, Zen, garden-level and edition controls are pressed. Each is
  asserted unchanged with a refusal toast, nothing is written to the Club store, and after reload
  the stale tab shows only the other tab's move.
- `tests/budget.test.cjs`: two documented raises (below).

## Verified

- Mutation: `src/club.js` reset to origin/main with the new test and a rebuild: `club_conflict`
  fails at "Undo after a conflict shows a refusal toast". Restored, rebuilt: 25 checks pass.
- `npm run build:android` clean; `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`:
  2,513 tests, 2,491 pass, 22 skipped, 0 fail (catalogue test needed no regeneration).
- Served build on port 18884: `tests/browser_origin.py` full suite 689 checks pass (includes
  `club_conflict`); `tests/browser_ui.py` 298 checks pass; `tests/browser_club.py` passes.
- Phone (390 px) and desktop (1280 px) screenshots of the refusal toast in the conflicted tab: the
  existing toast renders legibly over the bottom navigation and the board is unchanged.

## Budgets

Neither the deferred `club-engines` bound nor any chunk bound moved; `club.js` ships in the startup
bundle and the precached shell.

- Startup gzip: main 135,408 -> 135,435 (+27). Excess 11 over 127 KiB + 5,376; ceiling 127 KiB +
  5,440 (85 x 64) leaves 53. No feature room.
- Shell: main 1,443,051 -> 1,443,241 (+190). Excess 176.68; 924 x 64 would leave 15.32, so 1.32 MiB +
  59,200 (925 x 64) leaves 79.32. No feature room.
- PR #898 touches `tests/budget.test.cjs`; if main moves, merge it and re-measure both figures.

## NOT verified

- No physical phone, no hosted origin, no Android build run.
- The first conflicting action still mutates memory: the stale tab only learns of the conflict when
  its own save fails, so that first move (or setting) is shown but unsaved. The banner and toast say
  so; the guard stops every later control. Rolling back the first change is a separate design.
- The Escape-key Zen exit is deliberately left unguarded so a player cannot be trapped in Zen.

## Residual risk

Low. The guard is a refusal only, shared by the handlers above; any future Club control that mutates
state and calls `save()` needs the same call.
