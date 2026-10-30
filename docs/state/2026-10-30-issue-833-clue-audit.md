# Workshop clue-necessity audit (issue #833)

Branch `claude/clue-audit-833`, based on `claude/compose-wave-20261030` (includes #840).

## Changed

A separate `{ type: 'audit', puzzle }` request in `src/validator-worker.js`; verification cost
is unchanged. It reuses the draft's structural check (now one local `sceneShape`), proves the
draft has exactly one solution (otherwise "Verify the draft first; the audit needs exactly one
solution."), then re-solves once per clue without it. One arrangement left means that clue is
individually removable. Reply: `{ redundant: [sorted 0-based indices] }`. All solves share one
250,000-node ceiling (each call gets the remainder); exhaustion refuses with "The audit reached
its search limit before checking every clue. No clue was marked." and never sends a partial list.

The editor has an `Audit clues` button (enabled only when `draftVerified && !draftBusy`), validates
the reply strictly (sorted unique in-range integers, else "The clue audit returned an invalid result.
Run it again."), stores `draftAudit` behind the epoch and renders a focusable `#draft-audit` with
either "Every clue is needed..." or `Clue N` buttons (reusing `focus-draft-clue`) under the
"Each of these clues can be removed on its own..." caveat. Edits, Undo/Redo, regeneration, verify
start, route entry and the room-name edit path clear it. Nothing is ever removed automatically.
The conflict diagnosis and audit share one clue-list renderer and one index validator.

## Verified

- Focused run `scene-audit`, `scene-conflict`, `scene-ambiguity`, `workshop-*`, `budget`:
  213 tests, 212 pass. The one failure ("Android payload indexes...") needs `dist-android/`
  from `build:android`, not built here (same as #815's record).
- `tests/scene-audit.test.cjs` (8 tests, new): the essential fixture reports `[]`; one removable
  clue reports exactly `[8]` (independent solver oracle agrees); seed 7 reports `[]`, and with
  the true clue "Miles in row 2" added reports `[2, 5, 7]`; contradictory and ambiguous drafts are
  refused; structural checks match `draft`; the shared budget limits are
  `250000, 150000, 100000, 60000` for stubbed costs; exhaustion at the proof or mid-removal has no
  list; the input is not mutated. Against the pre-change worker all 8 fail; dropping `left -= nodes`
  fails 2 tests; loosening `=== 1` fails 4.
- `tests/workshop-worker-race.test.cjs` (+27, 75 total): reply matrix, stale epoch after
  edit/replace/navigate, clearing by edit/replace/navigate/verify/generate, verified-only gate.
  Five mutations of `app.js` (no clear on edit, no stale guard, no sort check, no range check, no
  verified gate) each fail 1-3 tests.
- Build `npm run build`: JavaScript gzip 133,133 (ceiling 135,808; base 132,845). Precached
  shell 1,426,794 -> 1,428,315 (+1,521); documented ceiling raise +1,280 (excess 1,250.68, leaves
  29.32) in `tests/budget.test.cjs`.
- Prettier check on changed files, `git diff --check`, `python -m py_compile tests/browser_ui.py`.

## NOT verified

`tests/browser_ui.py` (390/1440 seed 7: keyboard audit, focus, `Clue N` links, edit/Undo clearing,
expected `[2, 5, 7]`) was not run. No `build:android`, full `npm run verify`, real-origin browser
suite, hosted or physical-device check.

## Residual risk

The list is per-clue: removing two listed clues together may leave several arrangements (the page
says so). A hard draft can exhaust the budget and then gets only the refusal. The shell ceiling
has 29 bytes of headroom after the raise. Owner acceptance stays in [HUMAN_TODO.md](../../HUMAN_TODO.md).
