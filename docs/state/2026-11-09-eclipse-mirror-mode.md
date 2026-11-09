# Eclipse Lab: Mirror Ledger mode

## Changed

On branch `claude/eclipse-mirror-mode`, based on `a21dc725db565d62338b0602037d58a38dc3fbb3`, Mirror Ledger is available at `#/quiet/eclipse/mirror-01`. Eight revision-1 fixtures retain the standalone prototype's exact givens and links, flattened into two 16-cell boards. The existing classic line rules, bounded solver, linked marks, undo/redo, feedback, save locks, backup and recovery apply. Distinctness is scoped to each board. Mirror endpoints carry numbers, relation symbols and accessible names; boards stack below 600px. Arrow keys stay within a board and B switches boards. The original 32 definitions have a pinned SHA-256 regression assertion; the official catalogue remains 612 puzzles.

The standalone prototype remains in place with a link to the in-app mode. No dependency, budget ceiling, save schema, puzzle revision, gate script or production origin changes. No commit or push was made. Build outputs are generated only by the repository build, with no manual edits to `dist/`.

## Verified

- Baseline model/content/storage/prototype tests passed (28 tests).
- `npm.cmd ci --cache .cache/npm` passed; its local cache was moved under ignored `test-results/npm-cache/` afterward.
- `.venv` was created with `py -3 -m venv .venv`; `.venv/Scripts/python.exe -m pip install -r requirements-dev.txt` passed using a worktree-local cache.
- Independent enumeration proves all eight pairs unique, both individual boards ambiguous, and each link necessary. Tests cover answer-free hints, bounded search, board boundaries, saved histories, backup reopening and protected unknown bytes.
- `npm.cmd run build` passed on final application source: build `4073ba2525b8`, asset `eclipse-lab.e0e93c8b5f08.js`, 59,891 raw bytes / 17,537 gzip bytes, below the unchanged 65,536-byte raw ceiling. The generated receipt correctly reports `sourceDirty: true`.
- `npx.cmd prettier --check "src/eclipse-lab/**" "tests/**/*.mjs"` passed. `git diff --check` passed.
- `node --test tests/eclipse-*.test.* tests/mirror-ledger.test.mjs` failed overall: 40 passed, 1 failed. Only `tests/eclipse-delivery.test.cjs` failed, at its Android-manifest read (`ENOENT: dist-android/android-assets.json`); its preceding web accounting, hash, optional-cache and size checks passed. An earlier invocation was premature while the build was still running and lacked `build-info.json`; the post-build runs confirm the Android prerequisite is the remaining cause.
- With `PYTHONUTF8=1`, `CHROMIUM_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe` and worktree-local `TEMP`/`TMP`, `.venv/Scripts/python.exe tests/browser_eclipse_lab.py` passed at 320, 390 and 1280 pixels. All five first levels complete via real controls. Mirror additionally checks both layouts, named numbered endpoints, clue highlighting, hints, keyboard movement, undo/redo, saved completion after reload, feedback/backup/restore, offline reopening and 44px cell dimensions. The protected-data journey now exercises Mirror. Screenshots under ignored `test-results/eclipse-lab/` include `mirror-320.png`, `mirror-390.png` and `mirror-1280.png`; phone and desktop captures were visually inspected. An initial browser launch before the build finished timed out; the post-build run passed.

Changed files: `src/eclipse-lab/model.mjs`, `puzzles.mjs`, `player.mjs`, `storage.mjs`, `style.css`; `tests/eclipse-model.test.mjs`, `eclipse-content.test.mjs`, `eclipse-storage.test.mjs`, `browser_eclipse_lab.py`; `prototypes/mirror-ledger/README.md`; `docs/ECLIPSE-LAB.md`; this note.

Post-closeout design-hook triage: `side-tab` at `style.css:113` refers to the pre-existing save-status/recovery notice border, identical to `HEAD`. The intentional callout remains unchanged.

## NOT verified

Android payload accounting needs `dist-android/android-assets.json`. The Android builder's clean-source gate refuses this intentionally uncommitted worktree (`Android builds require a clean source tree.`). It was not bypassed. No hosted CI, deployment, physical phone, screen reader or human difficulty/enjoyment acceptance is claimed.

## Residual risk

The fixtures remain experimental and unranked. Existing owner release and physical-device gates in [HUMAN_TODO.md](../../HUMAN_TODO.md) remain unchanged. Android accounting must be rerun after this work is committed through the authorized integration workflow.
