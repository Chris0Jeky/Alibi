# Issue #885: a room-name edit no longer swallows the next click or Tab

Branch `claude/room-name-click-885`, based on main `0b256064`. Not pushed; no PR opened.

## Changed

- `src/app.js`: the document `change` handler no longer calls `render()` for a room-name field.
  That render ran as the field lost focus, on the pointerdown of the next click, and replaced the
  clicked button (the click was lost) or the newly focused field (focus fell to `<body>`).
  The `input` handler now calls the new `showRoomNames()`, which patches in place everything a
  render used to refresh: the "recheck required" badge (the input handler never updated it), the
  paint chips, the floor-plan cell labels, the clue list text and the clue-value menu (its chosen
  value is kept). The `change` handler only writes the saved name back into the field, so an
  emptied or whitespace-padded name still returns to the stored value as the render did.
  Enter in a room-name field does nothing (the fields are in no form), as before.
- `tests/browser_ui.py`: real-control regressions. Desktop: Tab and Shift+Tab from an edited room
  name land on the next and previous room field; the badge, chip, plan labels, clue text and clue
  menu show the new name; one mouse click on "Verify the logic" right after a rename verifies;
  an emptied name returns to the saved name without invalidating the draft. 390x844 touch
  context: one `tap` on Verify after a rename verifies.
- `tests/workshop-history.test.cjs`: the stub DOM gains `dataset`/`ariaLabel` and a `clueValues`
  stub so the history harness can run the new function.
- `tests/budget.test.cjs`: one documented raise per ceiling. `assets-source/library/catalogue.json`
  regenerated (`src/app.js` bytes and hash only).

## Budgets

| Ceiling | Base (main) | Branch | Excess | New ceiling | Left |
| --- | --- | --- | --- | --- | --- |
| Application gzip | 134,752 (32 left) | 134,988 (+236) | 204 | 127 KiB + 4,992 (78 x 64) | 52 |
| Precache shell | 1,440,159 (25.32 left) | 1,440,820 (+661) | 635.68 | 1.32 MiB + 56,768 (887 x 64) | 68.32 |

886 x 64 would leave 5.32 shell bytes, so the next step was taken. No feature room.

## Verified

- `npm run build:android` on the committed clean tree, then
  `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: 2,493 tests, 2,471 pass,
  0 fail (the rest skipped).
- `PYTHONUTF8=1 py -3 tests/browser_ui.py` on the branch build: 298 browser checks pass, no
  uncaught exceptions (headless Chromium, standalone document).
- Mutation proof: with `src/app.js` restored to origin/main and rebuilt, the 390px touch check
  "one tap on Verify after a rename runs the check" times out (the tap is swallowed) and, with the
  touch block removed, "Tab from an edited room name lands on the next room field" fails. Branch
  source restored and rebuilt afterwards. The desktop click case was not isolated on base, because
  the in-place refresh checks that precede it fail on base first (base refreshes only on blur).
- Phone (390x844) and desktop (1440x900) screenshots of the editor after renaming Room B to
  "Great Hall" and pressing Tab were inspected: chip, badge, verification notice and focus (next
  field highlighted) are correct, no overflow.

Re-measured after merging main (#886), with the review fold-in (`button.draft-cell`, `setAttribute`): startup gzip 134,777 -> 135,029, ceiling 127 KiB + 5,056 (79 x 64; 78 x 64 would leave 11), 75 left; shell 1,440,408 -> 1,441,109, ceiling 1.32 MiB + 57,024 (891 x 64), 35.32 left. These replace the entries above.

## NOT verified

- A physical phone or real touch keyboard; only Playwright touch emulation.
- Firefox and Safari (`ariaLabel` property reflection is used; supported in current engines).
- Hosted origin, service worker or IndexedDB-origin suites (`tests/browser_origin.py`): the change
  does not touch storage or offline code.
- Mouse-click regression in isolation on base (see mutation proof).

## Residual risk

- Any future UI that shows a room name must be added to `showRoomNames()`; the list was derived
  from every `roomNames` use in `draftEditor()`.
- The LOW items in the issue (Escape on the first-visit lesson, Sudoku banner pillarbox) are
  separate and untouched.
