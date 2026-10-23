# PR #742: browser probe permits restore-time worker revalidation

## Changed

Confirmed the CI root cause on branch
`fix/734-restore-revalidation-off-main-thread`, source HEAD
`00d22bb5455f10880d79f8596cb5b292bca137b3`: the ownership probe delayed every
successful `AlibiValidateImport` reply. Releasing the second import reply caused
the new `challenge-restore` job to be held too, so the restore could not finish.
The unchanged test reproduced the 30-second timeout waiting for the exact
restore-success message at the phone width (exit 1).

The probe now delays only `challenge-run` replies. It records successful worker
job types and asserts that two import validations are followed by exactly one
`challenge-restore`, while the held-import queue stays at two. Existing assertions
for zero stale writes, the newer `B.json` input, exactly one accepted restore and
the exact success message are unchanged. Production code is unchanged.

Searched every Python browser test for `ownershipProbe`, `holdValidation`,
`AlibiValidateImport`, validation counts and worker wrappers. Challenge recovery
has no held validation or fixed call count. Quiet Wing and Castle browser tests
have no affected hold/count assumption. Backup/Workshop/mobile ownership wrappers
already filter by job type; backup-worker counts concern staging without a
Challenge/Castle restore. The isolated challenge helper passes all worker types
through. No other harness adjustment was necessary.

## Verified

Created `.venv` inside this worktree and installed `requirements-dev.txt` and
Playwright Chromium there. The default Python 3.14.3 pip attempt failed to resolve
`greenlet`; Python 3.13.2 (matching CI's minor version) installed successfully.
Playwright is 1.62.0, Chromium 151.0.7922.34; local Node is 24.13.1.
Temporary browser profiles, pip cache and browser downloads stayed in `.venv`.

`npm.cmd run build` exited 0. Tested build `8e54ea093848` reports the source HEAD
above with `sourceDirty: true`, 570 puzzles and 307 emitted files.

Every browser run below used `PYTHONUTF8=1` and exited 0:

| File | Result |
| --- | --- |
| `tests/browser_challenge_ownership.py` | PASS: 12 scenarios, widths 390 and 1280 |
| `tests/browser_challenge_recovery.py` | PASS: 14 recovery/restore/reload scenarios, widths 390 and 1280 |
| `tests/browser_castle_recovery.py` | PASS: 9 checks |
| `tests/browser_backup_import.py` | PASS: 23 assertions; no uncaught page errors |
| `tests/browser_challenges.py` (additional) | PASS: launcher controls and saved replay restore at phone/desktop widths, including built-origin import and worker byte limits |

The first two files are the complete browser sequence from
`.github/workflows/challenge-ownership-controls.yml`; each starts its own
loopback HTTP server over `dist`. Castle/backup and the optional built-origin
challenge cases used this worktree's `node tools/serve.cjs` on port 18742 because
8787 was occupied. Only the server started here was stopped afterward.

- `npm.cmd run format:check`: exit 0; all matched files use Prettier code style.
- `node --test tests/restore-worker.test.cjs tests/challenge-restore.test.cjs`:
  exit 0; **19 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**.
- `git diff --check`: exit 0.

Logs are retained under ignored `test-results/restore-revalidation/`; normal
suite JSON/screenshots remain in their respective ignored `test-results/`
directories. The `.venv` and generated build outputs remain local and ignored.

## NOT verified

No hosted CI rerun, full `npm run verify`, deployment, native runtime, physical
device or human accessibility acceptance was performed. No Git-writing command
or `gh` call ran. Changes are uncommitted for the driver. Network access beyond
loopback test origins was limited to pip and Playwright installation.

## Residual risk

This is a test-probe correction; the production restore implementation and its
existing limits are unchanged. Owner acceptance remains in
[HUMAN_TODO.md](../../HUMAN_TODO.md), including physical Android and Quiet Wing
checks; browser emulation does not close those items. An initial attempted skill
lookup outside the worktree failed because the file did not exist; no file was
read or changed by that lookup.

Intended commit: `test: allow challenge restore revalidation in ownership probe`.
