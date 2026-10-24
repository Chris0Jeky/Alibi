# Quiet Wing restore confirmation commits once

Branch: `fix/quiet-wing-restore-once`. Starting HEAD and local `origin/main`:
`faea64e68c4a90a6eb76856b5f362fdac764a323`. The worktree was initially clean.
No remote refresh was performed under the task's network restriction.

## Changed

Root cause: `QWStore.replace` awaited validation without reserving the restore operation,
then queued every call. Each queued transaction legitimately captured its immediately
previous committed state, so duplicate confirmations changed recovery A to recovery B.
The shared confirmation handler also awaited `flush()` without a re-entry guard.
A second handler could wait for the first restore transaction, then restore B again
after a storage-only pending guard had released.

`src/quiet-wing/storage.js` now reserves a restore synchronously before validation and
rejects overlapping replacements. `finally` releases the guard only after the queued
operation settles, including validation and transaction failures.
`src/quiet-wing/app.js` disables and guards the shared confirmation button before
`flush()`. Success consumes that confirmation; failure enables a retry.
Wing and realm imports share this handler. There are no UI copy changes.

`tests/quiet-wing/contracts.cjs` covers duplicate A-to-B restores during validation and
the queued transaction, full original recovery preservation, failures releasing the
storage guard, and a later C restore retaining committed B. It also executes the actual
confirmation function with simulated controls and the transactional storage fixture:
duplicate calls during flush or an active restore, plus a late call after success,
must produce exactly one flush, one commit and one completion notification.

Published content, IDs/revisions, backup/save formats and database versions are unchanged.
Existing CAS, unknown-record protection and fallback restore refusal remain in place.

## Verified

- `npm.cmd ci --no-audit --no-fund`: exit 0; run once, 136 packages added in 28 seconds.
- Red before the storage fix: `node --test tests/quiet-wing/contracts.cjs`, exit 1.
  Both validation/transaction overlaps produced current B, recovery B, revision 2,
  two validations and two fulfilled calls instead of recovery A and one commit.
- Red before the confirmation fix, with the storage guard already present: the same
  command exited 1. The flush case entered twice; the transaction case overwrote recovery
  with B because the second handler's flush deferred its replacement until the first ended.
- Final `npm.cmd run format:check`: exit 0, all matched files pass Prettier.
- Final `npm.cmd run build`: exit 0; web build `837c6150abb8`, 307 files, 570 puzzles.
  Its identity correctly records `sourceDirty: true`; this is an uncommitted local build.
- Final `node --test tests/quiet-wing/contracts.cjs tests/quiet-wing.test.cjs`: exit 0;
  7 tests passed, 0 failed/skipped/cancelled; the contracts report 118 assertions.
- Emitted `dist/assets/quiet-activity.d8636d996dc3.js` contains the storage guard and
  the minified confirmation guard disabling the control before flush. An initial
  literal-source spelling check failed because the build minifies identifiers/booleans;
  inspection and the corrected emitted-code check passed.
- `git diff --check`: exit 0. No Git write commands, credentials or environment dumps.

## NOT verified

`npm.cmd test .` exited 1 in its existing `pretest` (`tools/check-test-build.cjs`),
before the full test suite ran. It reported the uncommitted working tree, a dirty-source
web build, missing/unreadable `dist-android` identity/payload, and missing Web/Android
receipts. This is an unmet gate prerequisite, not a failing assertion from the fix.
The task forbids Git writes, so no commit/stash or clean-tree bypass was attempted.
The driver must qualify a committed source with the required web/Android artifacts
before the full npm test gate can run.

Browser/UI and real-origin IndexedDB/service-worker suites are reserved for the driver.
No hosted, native or physical-device testing, deployment, independent review, commit,
push or PR was performed.

## Residual risk

The transaction adapter and actual handler pass synthetic Node fixtures; browser timing
and real device persistence still need the driver's browser suites. The store guard is
per loaded adapter; existing transactional CAS remains the cross-tab protection.
Later separately reviewed restores intentionally replace the prior recovery copy.

Owner actions remain in [HUMAN_TODO.md](../../HUMAN_TODO.md), particularly q-2 and q-4
physical Android/Quiet Wing acceptance. None were inferred complete or changed here.

Intended commit message: `fix: prevent overlapping Quiet Wing restores`
