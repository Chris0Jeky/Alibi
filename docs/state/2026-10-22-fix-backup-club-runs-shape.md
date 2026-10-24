# Club runs shape validation

Branch: `fix/backup-club-runs-shape`. Starting HEAD and local `origin/main`:
`faea64e68c4a90a6eb76856b5f362fdac764a323`. The initial worktree was clean.
No network refresh, Git writes, commit, push or PR was performed.

## Changed

Root cause: `src/backup-validation.js:101` checked only whether `runs` was
truthy before iterating its entries. An empty array, `true` and `1` passed.
Club creates named runs at `src/club.js:614` and records moves at
`src/club.js:1035`; the JSON clone at `src/club.js:9`, used by persistence at
`src/club.js:332`, drops named array properties.

Before editing production code, the exact reported JSON was accepted by the
shared validator. A Node VM using the actual Club initialization, Archive route,
`club-walk` action (`left`) and flush against disposable in-memory localStorage
reported `saveError: ""` and persisted `runs: []`. This reproduces the loss using
the persisted malformed state; it is not a browser restore-dialog test.

The shared validator now also requires `typeof runs === 'object'` and rejects
arrays. Its existing null/missing guard remains. Club load/validation and the
standalone/combined backup worker all route through this function. No save or
backup schema, database version, puzzle ID/revision, UI copy or recovery/write
ordering changed.

Three tests in `tests/club-save-validation.test.cjs` cover the exact array input,
scalar/missing values, and valid object runs retaining an Archive move across
JSON persistence and validation.

## Verified

- `npm.cmd ci --no-audit --no-fund` ran once: exit 0; 136 packages added.
- Red, before the fix: `node --test tests/club-save-validation.test.cjs` exited 1;
  7 tests, 5 passed, 2 failed. Both new rejection tests failed with
  `Missing expected exception` (the scalar test first failed on `true`). The
  valid-object persistence control passed.
- Green, after the fix: the same command exited 0; 7 passed, 0 failed.
- `npm.cmd run format:check`: exit 0; all matched files use Prettier style.
- `npm.cmd run build`: exit 0; web build `3c35c1fdb0b6`, 570 puzzles,
  13 types, 5 casebooks, 307 files. Identity correctly records dirty source.
- `node --test tests/backup-validation.test.cjs tests/club-backup-scalar-bounds.test.cjs tests/club-storage.test.cjs`:
  exit 0; 38 passed, 0 failed, including 86 Club storage assertions in 20 groups.
- `git diff --check`: exit 0.

## NOT verified

`npm.cmd test .` exited 1 in the existing pretest, before running the suite:
the working tree differs from committed source, the web artifact has dirty-source
identity, Android identity/runtime payload is missing, and matching web/Android
receipts are missing. Committing/stashing is explicitly prohibited for this task;
the gate was preserved. The driver must qualify committed source with fresh web
and Android artifacts before the complete npm suite can run.

Browser suites belong to the driver. No real IndexedDB, browser import-dialog,
physical-device, hosted, CI or deployment result is claimed.

## Residual risk

The fix prevents malformed shapes from being accepted; it cannot recover progress
already lost through JSON serialization. Existing unknown-save preservation,
concurrency and pre-restore recovery mechanisms remain unchanged. Existing owner
acceptance stays open in [HUMAN_TODO.md](../../HUMAN_TODO.md).

Intended commit message: `fix: reject malformed Club runs containers`.
