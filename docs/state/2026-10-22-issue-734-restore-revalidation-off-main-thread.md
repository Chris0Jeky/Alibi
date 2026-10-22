# Issue #734: restore replay validation stays in the bounded worker

Branch: `fix/734-restore-revalidation-off-main-thread`.
Initial implementation is committed at `83491df7`; the budget follow-up below is
an uncommitted local patch. The driver owns commits and `npm run verify`.

## 2026-10-22: shell budget follow-up

Shell bytes use the budget test's exact accounting:
`coreOfflineBytes - officialContentBytes`.

| Source | Shell bytes | Old cap | Excess |
| --- | ---: | ---: | ---: |
| Parent `904734b5` (derived from emitted delta) | 1,411,404 | 1,412,792.32 | none; 1,388.32 headroom |
| Original clean head `83491df7` | 1,413,606 | 1,412,792.32 | 813.68 |
| Trimmed working tree | 1,413,510 | 1,412,792.32 | 717.68 |

The first `npm.cmd run build` passed. The parent was not rebuilt: the unchanged
worker assembly from `tools/build.cjs` was reconstructed with read-only
`git show HEAD^:<path>` for the changed Castle validation modules and dispatcher.
Its head output matched the emitted worker byte for byte. Parent/head workers
measure 195,446 / 197,648 bytes, a +2,202-byte delta. All other changed runtime
files belong to the separately accounted optional Castle/Quiet Wing bundles;
their URLs and the shell's identity/hash fields retain fixed widths. Subtracting
the worker delta from the measured head shell gives the parent figure above.

Removed four redundant clones of state/records already detached by `validate()`,
and combined the two overlapping imported-notebook helpers into one suffix and
its bounded section. The trimmed worker measures 197,553 bytes: 95 bytes saved,
with every validation call and guard retained. The actual shell saves 96 bytes;
one additional byte is `sourceDirty: false` becoming `true` in the build identity,
not a code saving. On matching identity metadata, the remaining worker/shell
growth is 2,107 bytes; measured against the original clean parent it is 2,106.
A regression test mutates nested merged/replaced output and confirms both
caller-owned inputs and the backup remain unchanged.

The honest trim still exceeds the old cap. Only the precache-shell allowance
moves: +3,072 bytes, the smallest 1,024-byte multiple covering the measured net
growth (and the matching-metadata delta). The new cap is 1,415,864.32 bytes
(`1.32 * 1024 * 1024 + 31744`), leaving 2,354.32 bytes at this working tree.
This is measured repair allowance, not feature room. No other budget changes.

Final requested proving results on `83491df7` plus this working patch:

- `npm.cmd run format:check`: exit 0; all matched files use Prettier code style.
- `npm.cmd run build`: exit 0; build `5dce3b35a4b1`, 307 files, 570 puzzles;
  `coreOfflineBytes` 1,931,129 minus `officialContentBytes` 517,619 = 1,413,510.
- `node --test tests/budget.test.cjs tests/restore-worker.test.cjs tests/challenge-restore.test.cjs`:
  exit 0; **34 passed, 0 failed, 0 skipped**. Every other budget also passes unchanged.
- `node --test tests/castle-backup.test.mjs`: exit 0;
  **10 passed, 0 failed, 0 skipped**, including the new detached-output regression.
- `git diff --check`: exit 0.

No Git writes, network calls, hosted/browser/native/device runs or full
`npm run verify` were performed in this budget follow-up. Temporary measurement
code and build logs stay under the ignored worktree-local `test-results/`
directory. Residual runtime limits and open [HUMAN_TODO.md](../../HUMAN_TODO.md)
items below remain unchanged. The patch is ready for the driver's scoped commit.

Intended follow-up commit: `fix: trim restore worker cost and account for shell growth`.

The following sections retain the initial implementation handoff and its earlier
verification; they do not replace the exact budget-follow-up results above.

## Changed

All reported call sites still existed at intake:

- `src/challenge-storage.js:143` validated every incoming run synchronously in
  `write()`, also used by `restore()`. This was the same registry replay validator
  as the worker, protecting direct restore calls and the bytes actually written.
  The transaction additionally validated the existing record to distinguish
  corruption (explicitly replaceable with recovery) from a valid concurrent edit.
- `src/quiet-wing/app.js:1652` called that restore path after a successful
  `challenge-run` worker result. This call was the bridge to the duplicate pass,
  rather than a separate validator. The UI call remains unchanged and now reaches
  worker-backed restore preparation.
- `src/castle/storage.mjs:231` called the same `validateBackup()` used by the
  worker. Subsequent merge/final-state validation also replayed Hanoi drafts and
  answers, protecting merge limits, prerequisites and the resulting save. The
  transaction's existing-record validation protected unknown/future disk records.

Restore now captures the input JSON before yielding and revalidates through the
existing `AlibiValidateImport` helper, retaining its 25-second worker watchdog and
the original 3 MiB / 512 KiB import byte caps. New `challenge-restore` and
`castle-restore` jobs validate both the import and an existing disk snapshot;
Castle also prepares and validates the complete merge/replacement in the worker.
Its record-envelope validator moved unchanged to the shared backup module.

A short readonly transaction obtains the disk snapshot before worker validation.
The write transaction compares its JSON representation again and retains revision
guards, recovery and replacement in one atomic transaction. A changed snapshot is
refused; no worker is awaited inside a live IndexedDB transaction. Worker failure,
missing background validation and protected/fallback storage refuse replacement.
Main-thread restore work consists of JSON copying/comparison and storage guards,
without replay validation of either incoming or existing runs.

The isolated launcher browser fixture now supplies a bounded helper using the
compiled worker, because it does not load the application shell that normally
provides `AlibiValidateImport`. No generated `dist/` files were edited manually;
the requested build generated its normal ignored output.

## Verified

- `npm.cmd ci --no-audit --no-fund`: exit 0; 136 packages added. Run exactly once.
- Failing-first core regressions: original Challenge and Castle restore paths each
  incremented a main-thread replay counter before returning (`1 !== 0`).
- `npm.cmd run format:check`: exit 0; all matched files use Prettier code style.
- `npm.cmd run build`: exit 0; web build `4661fca4c7bb`, 570 puzzles, 307 files.
- The following command exited 0: **64 tests passed, 0 failed, 0 skipped**.

```sh
node --test tests/challenge-restore.test.cjs tests/castle-backup.test.mjs tests/restore-worker.test.cjs tests/challenge-storage.test.cjs tests/challenge-storage-revision.test.cjs tests/castle-storage.test.mjs tests/validator-worker.test.cjs tests/validator-challenge-import.test.cjs tests/validator-limits.test.cjs
```

Coverage includes 5,000 alternating Hanoi actions on both incoming and existing
Challenge runs with zero main-thread registry calls; input mutation after restore
starts; invalid replays; worker rejection; disk changes while validation is pending;
recovery retention and transaction failure; stale/unsafe revisions; Castle merge
limits and unknown current records; and the actual compiled worker's new jobs and
byte caps. Existing restore tests run with the production worker dispatcher in a
VM; the compiled-worker tests additionally exercise the bundled real engines.

- `py -3 -m py_compile tests/browser_challenges.py`: exit 0.
- `git diff --check`: exit 0.

## NOT verified

`npm run verify` and commits are reserved for the driver. No browser/real-origin,
hosted, native or physical-device execution was performed. No UI freeze duration
was measured. The browser fixture has syntax evidence only. No network service
was called except the one dependency installation; no Git-writing commands ran.

## Residual risk

Restore now needs one additional readonly transaction and a working background
validator; failures preserve the current save. JSON copying/comparison still runs
on the main thread in proportion to payload size. Ordinary read, write, recovery
export and launcher playback replay paths are unchanged; this change isolates
restore validation, not every game replay operation.

Owner acceptance items remain in [HUMAN_TODO.md](../../HUMAN_TODO.md), including
physical Android recovery/TalkBack and Quiet Wing device checks. None is claimed
complete here. The initial change is committed; the driver owns the budget
follow-up commit and full `npm run verify`. No publication or merge was attempted.

Initial commit message: `fix: keep restore replay validation in the bounded worker`.
