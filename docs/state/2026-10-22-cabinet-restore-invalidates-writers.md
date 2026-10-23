# Cabinet restore invalidates existing writers

Branch: `fix/cabinet-restore-invalidates-writers`. Local HEAD and local
`origin/main` both resolve to `faea64e68c4a90a6eb76856b5f362fdac764a323`.
No remote refresh was performed under the task's network restriction.

## Changed

Root cause: `Store.restore` previously installed imported run revisions verbatim
(`src/storage.js:367` before this change). `Store.saveRun` admits writes by comparing
the persisted revision with the writer's expected revision (`src/storage.js:250`).
The Cabinet caller at `src/app.js:2467` therefore allowed a restored revision 7 to
be replaced by a stale tab also holding revision 7 when BroadcastChannel was absent.

The shared restore transaction now assigns every imported run
`max(imported revision, current local revision or 0) + 1`. It computes and checks
all replacement revisions before writing recovery or clearing any store. Unsafe
increments refuse the restore. The pre-restore recovery still contains the exact
previous records; incoming backups are not mutated. Puzzle IDs and definition
revisions, save/backup formats, database version, fallback refusal, expected-state
conflicts and UI remain unchanged.

Regression coverage uses two Store instances sharing the existing fake IndexedDB
fixture, without BroadcastChannel, and a real validated `sudoku-01@1` record. It
covers equal/older/newer imported revisions, subsequent successful fresh writes,
unchanged recovery and backup inputs, repeated restores, a newly imported
revision-zero run with an unsaved writer, and safe-integer overflow refusal.
Existing restore revision expectations were updated in the two changed suites.

## Verified

- `npm.cmd ci --no-audit --no-fund`: exit 0; added 136 packages. Run once in this worktree.
- Red before the production fix: `node --test tests/storage-restore.test.cjs`
  exited 1, with 3 passing and 6 failing tests. The exact revision-7 sequence
  failed with `Missing expected rejection (ConflictError)`: the stale save was
  admitted. Older/newer revision monotonicity, repeated restore and the two
  overflow assertions also failed.
- A further failing-first revision-zero regression rejected an incomplete
  overlap-only fix: the unsaved tab's expected-revision-0 write succeeded.
  The final fix advances newly imported runs as well.
- `npm.cmd run format:check`: exit 0; all matched files use Prettier style.
- `npm.cmd run build`: exit 0; web build `42deb48f8b29`, 570 puzzles,
  167 deferred puzzles. Its identity truthfully records `sourceDirty: true`.
- `node --test tests/storage-restore.test.cjs tests/storage.test.cjs`: exit 0;
  14 tests passed, 0 failed; 58 storage contract assertions.
- `node --test tests/storage-restore.test.cjs tests/storage.test.cjs tests/storage-revision.test.cjs tests/app-cabinet-export.test.cjs`:
  exit 0; 49 tests passed, 0 failed, 0 cancelled/skipped/todo.
- `git diff --check`: exit 0.

## NOT verified

`npm.cmd test .` was run and exited 1 in `pretest` (`tools/check-test-build.cjs`),
before any full-suite tests ran. The existing guard reports uncommitted source,
a dirty-source web identity, missing Android identity/runtime payload, and missing
matching web/Android receipts. The task forbids Git writes, so no commit/stash or
guard bypass was attempted. This is a qualification prerequisite failure, not a
claim that the full Node suite passed. After integration into committed source,
the driver still needs matching `npm run build:android` artifacts and `npm test`.

Browser suites are reserved to the driver. No real-origin IndexedDB rollback,
cross-tab browser, offline/service-worker, native, physical-device, hosted or
deployment verification is claimed. The fake-IDB tests exercise sequential
restore/save semantics, not real IndexedDB durability or transaction rollback.
No Git writes, publication, network services other than the requested install,
or access outside this worktree beyond toolchain reads were performed.

## Residual risk

Full-suite and driver browser qualification remain outstanding. At the safe-integer
limit, restore now refuses to install an unsafe next revision and retains prior
data. Restoring unchanged runs also advances their local write revisions, so
other open writers must reload before saving. This intentionally applies through
the shared restore path, including Add missing only.

[HUMAN_TODO.md](../../HUMAN_TODO.md) remains the owner-action source; its existing
physical-device and publisher/acceptance items are unchanged and are not closed
by these Node tests.

Intended commit message: `fix: invalidate stale Cabinet writers on restore`.
