# 2026-10-30 second composition: clue audit, Rehearse, Read clues, resume previews, follow-ups

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
- #831 resume previews (`claude/resume-preview-831`, GPT-6.1 Sol peer slice): in-progress Picture
  logic cards draw the saved filled squares; a throwing `solution` getter proves the solution is
  never read; unstarted/completed cards keep the motif byte for byte.
- #844 and #854 follow-ups (`claude/scene-followups-844-854`): honest refusal when conflict
  diagnosis exhausts its budget (shared `bounded()` helper with the audit); per-clue remove-button
  names; singular one-clue heading; a rehearsal no longer trips the cross-tab save lock, no longer
  stamps its seconds onto an installed run's backup copy (a real collision, now tested), labels its
  review exit, and is not blocked by an existing storage lock (`locked()` is unchanged for normal play).

## Composition-only changes

`assets-source/library/catalogue.json` regenerated after each merge. `tests/budget.test.cjs` carries one
measured entry per component (startup JS gzip: 132,844 -> 133,538 -> 133,579 -> 133,705, ceiling
127 KiB + 3,680, still 2,112 below the pre-#845 ceiling; shell 1,429,765 -> 1,430,091 -> 1,430,393,
ceiling 1.32 MiB + 46,336). `tests/journey-restart.test.cjs` and `tests/completion-hooks.test.cjs`
now load the real `locked()` helper into their VM slices (the #854 refactor moved six checks into it).

## Verified

Local `build:android` then the full Node suite on the final tree: 2,443 tests, 2,421 pass, 0 fail,
22 skipped (budgets included). Every component independently reviewed: no CRITICAL/HIGH. Driver
browser check of Rehearse on the built app (zero IndexedDB/localStorage writes).

## NOT verified

Browser suites locally (`browser_ui.py` Rehearse/audit journeys, `browser_origin.py` rehearsal
scenario, `browser_keyboard_help.py` Read clues) - hosted CI runs them. Physical device and real
screen readers (HUMAN_TODO q-2). #844 and #854 are resolved here; #831 phone-width legibility is
not inspected.
