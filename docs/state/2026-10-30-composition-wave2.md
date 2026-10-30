# 2026-10-30 second composition: clue audit, Rehearse, Read clues

Branch `claude/compose-wave2-20261030`, stacked on the first composition (#853).

Components, each independently reviewed (no CRITICAL/HIGH):
- #833 Scene Maker clue-necessity audit (`claude/clue-audit-833`): per-clue redundancy within one
  250,000-node budget; honest refusal on exhaustion. Ten generated seeds audit in 3-9 ms, none
  refused; seeds 8 and 9 report redundant clues.
- #828 Scene Maker Rehearse (`claude/rehearse-828`, stacked on #833): plays a verified draft in
  memory. Driver check on the built app at 390x844 with IndexedDB `put/add/delete/clear` and
  `localStorage.setItem` counters: zero writes across start, a placement, Check, 16 seconds past the
  15-second save timer, and Back to the editor; the draft returned verified with its clues intact.
- #832 Picture logic Read clues (`claude/announce-clues-832`, GPT-6.1 Sol peer slice): C or a
  button announces the selected square's row and column clues in the polite live region.

## Composition-only changes

`assets-source/library/catalogue.json` regenerated; `tests/budget.test.cjs` gets two measured
entries: startup JS gzip 133,538 (first composition 132,844; ceiling +128 to 127 KiB + 3,520,
still 2,240 below the pre-#845 ceiling) and shell 1,429,765 (ceiling +448 to 1.32 MiB + 45,696).

## Verified

Local build; `tests/budget.test.cjs` 17/17; focused Node suites (scene, workshop, read-clues,
deferred-route, pulseboard-host, render-analysis, insights, asset catalogue, budget) 328/329 - the
one failure needs `dist-android/` from `build:android`, not run locally.

## NOT verified

Browser suites locally (`browser_ui.py` Rehearse/audit journeys, `browser_origin.py` rehearsal
scenario, `browser_keyboard_help.py` Read clues) - hosted CI runs them. Physical device and real
screen readers (HUMAN_TODO q-2). Follow-ups: #844, #854.
