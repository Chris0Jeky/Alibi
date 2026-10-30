# Issue #832: read Picture logic clues

## Changed

Picture logic now offers C (including Shift+C) and a Read clues button with
`aria-keyshortcuts="C"`. Both use the existing polite toast region for 5.5 seconds.
Example, selected square B3: "Row 3 clue: 2 1. Column B clue: 4."
Blank-line clues read as 0, matching the board. Keyboard use preserves focus,
selection and progress; repeats, Ctrl/Meta/Alt, pause and existing editing/dialog
guards suppress it. The control note mentions the shortcut.

Changed files: `src/app.js`, `tests/nonogram-read-clues.test.cjs`,
`tests/browser_keyboard_help.py`, and this handoff. Raw `src/app.js` size:
215,919 to 216,548 bytes, **+629 bytes**. No ceilings changed.

## Verified

- Before editing app.js, the new Node suite produced 5 failures and 2 passes:
  both keys, blank clues, button action and control markup failed as expected.
- `node --test tests/nonogram-read-clues.test.cjs tests/render-analysis-once.test.cjs`:
  13 passed, 0 failed (7 new regression tests, 6 existing renderer tests).
- `node --check src/app.js` and
  `python -m py_compile tests/browser_keyboard_help.py` passed.
- Prettier checked changed JS/Markdown; Python has no installed Prettier parser
  and is covered by the compilation check. `git diff --check` passed.

The Python test adds Picture logic to both viewport profiles, presses c after
arrow-key selection, checks toast text and Chromium's actual accessibility tree,
and compares the exact focused DOM element and puzzle state before/after.

## NOT verified

Browser/accessibility-tree execution, screen-reader speech, visual inspection,
physical devices, full verification, builds and emitted gzip/shell budgets were
not run, per the task restrictions. No installs, servers or Git writes performed.
The driver must execute the new browser assertions against a fresh build.

## Residual risk

The reported shell headroom is about 30 bytes; the emitted release may exceed
its budget. The driver owns build/budget qualification and any documented ceiling
decision. Physical Android/TalkBack acceptance remains open in
[HUMAN_TODO.md](../../HUMAN_TODO.md); this source-level change does not close it.
