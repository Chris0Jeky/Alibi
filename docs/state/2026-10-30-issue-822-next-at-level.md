# Issue 822: Another puzzle stays at the player's level

Branch `claude/next-at-level`. Closes #822.

## Scope

- `pickNext(puzzles, currentId, isSolved, isStarted, feel)` in `src/core.js` (the module the Node
  tests already load) replaces the inline rule in `nextPuzzle()` in `src/app.js`.
- Rule: same family; target tier is the current tier, one up after `'easy'`, one down after
  `'hard'`. Unstarted and unsolved puzzles first, nearest tier to the target first (ties go toward
  the requested direction, up when no choice was made), catalogue order after the current puzzle
  and wrapping within a tier. Then the same ordering over any unsolved puzzle (resumes an unfinished
  run), then the old `rest[0]`.
- Tier is the base `difficulty` name; `difficultyStatus` and the "provisional" label are ignored.
- `AlibiVoices.feel(id)` in `src/voices.js` (already in the application bundle) reads the player's
  own last rating from `localStorage` (`alibi:voices:state:v1`, `rated[id].difficulty`) and maps
  `too-easy` to `'easy'` and `too-hard` to `'hard'`; anything else, or unreadable storage, is `null`.
- Casebook flow (`route.book`) is untouched. No save-format, telemetry or storage-key change.

## Evidence

- New `tests/next-puzzle.test.cjs`: same tier, wrap-around, step up, step down, exhausted tier,
  unfinished-run skipping, resuming when only unfinished runs remain, all solved, one-puzzle family
  and unknown id or tier.
- The same file run against a stub of the old rule: 6 of 8 fail.
- `node --test tests/next-puzzle.test.cjs tests/budget.test.cjs tests/browser-wiring.test.cjs`:
  26 pass, 0 fail.
- `javascriptGzipBytes` 134,166 to 134,776 (+610); ceiling 135,808 unchanged.

## Limits

- The rating exists only where the rating row is shown (official puzzles on the primary origin) and
  is stored after the tap's queueing succeeds. Elsewhere, or if "Another puzzle" is tapped before
  that finishes, `feel` is `null` and the same-tier rule applies.
- A rating applies to the puzzle just finished only; there is no running estimate of level.
- No browser suite or phone check was run; the `nextPuzzle()` wiring is covered by the build and
  the existing wiring test, not by a click-through.
