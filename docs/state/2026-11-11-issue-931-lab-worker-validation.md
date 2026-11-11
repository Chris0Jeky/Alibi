# Lab backups use bounded validation

Issue [#931](https://github.com/Chris0Jeky/Alibi/issues/931) covers Eclipse Lab and Timeline
Desk backup review and restore. Each lab's existing optional bundle can run in the one-shot
worker used by the Cabinet adapter. The web and Android payload use the local hashed bundle.
The standalone preview supplies its inline bundle. The build adds no precache entry.

A file review validates the backup and next local revision in the worker. The store keeps that
result private until explicit confirmation. Confirmation prepares the durable shelf and legacy
recovery in the worker before taking the write lock. The locked write compares both raw records
and commits the active shelf and its recovery together. Both labs leave legacy recovery bytes
intact and can read older saves and backup files. Eclipse refreshes untouched feedback fields
from the imported run while retaining fields edited during restore.

Once a player confirms, the preview controls give way to a restore status until completion.
An older response cannot replace a newer review. A failed or cancelled review, a worker
failure, or a change to either persisted record before the write leaves the saved bytes intact.

## Evidence

- Base `f1329a25f1f677a2d4f87f529a242f1710699865`. Development web build `1cf52fefa768`
  from the uncommitted candidate measured 135,616 bytes startup gzip, 207,320 bytes initial code and
  content gzip, and 1,444,139 bytes core shell excluding official content. Timeline measured
  47,729 bytes and Eclipse 62,277 bytes. The existing caps are unchanged.
- 81 focused Node tests passed, including the emitted worker dispatch, backup and recovery
  validation, stale revisions, cancelled and timed-out previews, worker cleanup, and budgets.
  The changed JavaScript passed Prettier and the three browser test files parsed.
- `tests/browser_eclipse_lab.py` passed at 320, 390 and 1280 pixels. `tests/browser_timeline_lab.py`
  passed at 390 and 1280 pixels. Both used Playwright 1.62.0 and confirmed a restore offline
  on a controlled loopback origin and in the standalone file. In each target they verified
  the imported shelf after reload, downloaded the original shelf as recovery and restored it.
  Both held the confirmation worker message and the Web Lock to verify the progress status
  replaced the preview controls throughout. Eclipse's delayed-lock test entered only a note
  and verified the imported rating and difficulty survived saving it and reloading. Timeline
  exercised the existing draft and recovery race.
- A Node probe loaded the Eclipse store from the exact base and reproduced its legacy recovery
  replacement when a quota error refused the active write. The same old store protected and
  exported the new embedded record byte-for-byte without writing over it. The current store
  reopened and recovered the previous shelf.
- The Android build command emitted the development web payload and then refused to derive
  Android from an uncommitted source tree. Clean Android delivery and the new Android-origin
  backup checks remain part of exact-head CI. Physical devices were outside this proof.

See [HUMAN_TODO.md](../../HUMAN_TODO.md) for owner decisions.
