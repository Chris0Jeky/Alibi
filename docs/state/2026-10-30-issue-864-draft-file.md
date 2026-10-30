# Issue 864 slice: Scene Maker draft as its own file

Branch `claude/draft-file-864`. Implements #864.

## Changed

- **Export draft** (secondary small button in the editor actions, enabled whenever a draft exists
  and no check is running) downloads `<draft id>.draft.json` containing
  `{ format: 'alibi-scene-draft', schema: 1, draft }`. Unverified, ambiguous and conflicting drafts
  export. The stored `solution` is stripped, so a shared file never carries an answer.
- **Import draft** (button in the first Scene Maker panel, so it works on a device with no draft yet;
  hidden static `#draft-input` in `src/index.html`) reads the file, refuses over 256 KiB before
  reading it, and sends `{ type: 'scene-draft-import', text }` to the bounded worker. The worker
  re-checks the byte size, parses, requires `format` and `schema`, and returns
  `validateSceneDraft` (shape only; unsolvable drafts are accepted). Any other file gets one message:
  "This is not an Alibi Scene Maker draft. Your current draft is unchanged."
- `validateSceneDraft` requires a `solution`, so the worker supplies a placeholder (person i on
  square i) and ignores any answer a hand-edited file carries. While the draft is unverified and
  still holds that placeholder, "Show author solution" is disabled; verifying replaces it with the
  real arrangement.
- Applying an import with an existing draft asks first ("Replace draft" / "Keep my draft"), then goes
  through `recordDraft`, so Undo restores the previous draft and verification, comparison, conflict
  and audit state are cleared. With no draft it applies at once. The reply is epoch-guarded like
  verify: an edit, replacement or navigation after the file was chosen drops the reply, and a draft
  edit while the dialog is open refuses the stale confirmation.
- Other saves are not touched; only the `workshop-draft` meta record is written.

## Verified

- `node --test tests/scene-draft-file.test.cjs`: 5 tests (round trip equal apart from the placeholder
  answer, answer in a hand-edited file ignored, unsolvable draft accepted, wrong
  format/schema/shape/JSON refused, byte-accurate cap with a two-byte character).
- `node --test tests/workshop-worker-race.test.cjs`: 84 tests, 7 new (confirm before replace, Undo
  and derived-state clearing, stale reply and stale confirmation, navigation, no existing draft,
  size/busy/refusal, export without answer). The harness now starts at `recordDraft`.
- Fail without the change: against `origin/main`'s `validator-worker.js` all 5 draft-file tests fail;
  against `origin/main`'s `app.js` (`ALIBI_APP_SOURCE`) the race harness cannot evaluate and 81 of 84
  fail, including all 7 new ones.
- `npm run build:android` then `npm test`: 2455 tests, 2433 pass, 0 fail, 22 skipped.
- `python tests/browser_ui.py` (document harness, Chromium): 286 checks pass, including the new
  390px journey: export without answer, pack file and oversize file refused with the draft unchanged,
  nothing replaced before confirmation, replace, unverified and no answer shown, no horizontal
  overflow, Undo and Redo, and re-verify to the original puzzle.
- Prettier on changed files; `git diff --check`; `python -m py_compile tests/browser_ui.py`.
- Budgets (`tests/budget.test.cjs`): application gzip 133,705 -> 134,098 (ceiling 127 KiB + 4,096,
  45 spare); shell 1,430,393 -> 1,432,234 (ceiling +1,824, 46.32 spare). `catalogue.json` refreshed.

## NOT verified

- No physical phone, no hosted origin, no real-IndexedDB suite (`browser_origin.py`) run; the file
  picker was driven with Playwright `set_input_files`, not a native picker.
- No second browser engine; downloads were checked in Chromium only.

## Residual risk

- A file is trusted at `validateSceneDraft` strength, as a saved draft already is: extra unknown keys
  inside the draft object are kept (the 256 KiB cap bounds them).
- Import is always one confirmed replacement; there is no merge of two drafts.
- A verified draft whose real answer happens to put person i on square i is unaffected (the toggle is
  disabled only while unverified).
- `ROADMAP.md` line 61 still lists "portable unfinished-draft export"; left for the owner to retire.
