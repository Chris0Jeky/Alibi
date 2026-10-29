# Backup validation wait — ex-alibi-15

Worktree: `Alibi/.wt/ex-alibi-15`; branch: `sol/ex-alibi-15`.
Base: `a1d7c7115c3828d5317accbf04b6578a561323f8`.
No Git writes, publication, deployment, dependency changes or production edits.

## Changed

`tests/browser_ui.py` waits for the restore-merge control after backup validation,
using the existing five-second assertion budget instead of an unconditional 150 ms
sleep. Its original count assertion remains. One real Blob worker response is delayed
500 ms to exercise the race on every run; the native Worker constructor is restored
as soon as that worker is created. Validation and the returned backup data are real.

## Verified

- Clean baseline `npm.cmd run verify`: exit 0; 2,125 Node tests, 2,107 passed,
  18 skipped, zero failures; both subsequent Quiet Wing scripts passed.
  Log: `test-results/baseline-verify.log`.
- Original `py -3 tests/browser_ui.py`: failed at the 150 ms backup-validation
  assertion. A separate diagnostic run failed earlier on an invisible dialog-close
  button; that separate route/dismiss timing concern is outside this change.
- `py -3 test-results/prove-backup-wait.py --original`: expected exit 1 at
  “Exported backup validates on import”, with the real worker response delayed
  500 ms. The same focused probe without `--original` passes using the condition wait.
- Proposed full fixture executed from `test-results/prove-backup-wait-suite.py`:
  all 187 browser checks passed. The final fixture also retains the original
  count assertion after the condition wait.
- Baseline `py -3 tests/browser_september_feedback.py`: both 390 and 1440 px passed.
- Python compilation and `git diff --check` passed.

- Final `py -3 tests/browser_ui.py`: exit 0, all 187 checks passed, including the delayed backup response (test-results/final-ui.log).
- Final `npm.cmd run format:check`, `py -3 -m py_compile tests/browser_ui.py` and `git diff --check`: passed.

## NOT verified

Hosted CI, independent PR review, Linux Chromium, physical Android/TalkBack and
publication were not performed. Full verify is a clean-baseline receipt; the
coordinator owns the commit and any final clean-source gate, as requested.

## Residual risk and candidate investigation

No shipped behavior or byte ceiling changes. The browser fixture's one delayed
message uses the actual worker's result, without retrying an import or changing
its validation deadline. The separate dialog-close timing issue remains unmodified.

Issue #712 remains open. Windows Chromium 151 controlled probes found a related
mechanism: dispatching the existing `alibi-storage-change` event during a scene
pointerup replaces the player DOM. Down/up identify cell-0, the subsequent click
lands on the shell, and moves stay at zero; the undisturbed control commits one
move. This establishes a causal render-loss mechanism, not the historical hosted
trigger. Scripts: `test-results/probe-render-tap.py` and
`test-results/probe-release-render.py`. A product repair needs to preserve gesture
identity while still applying storage/update blocking immediately. It is a separate
slice: the clean baseline has only 86.32 raw shell bytes and 57 gzip bytes of headroom.
No production workaround or test retry was introduced for #712.

`HUMAN_TODO.md` remains authoritative and unchanged. Physical-device freeze,
Android/TalkBack and Quiet Wing acceptance remain open; browser evidence does not
close them. No new owner action is required by this test-only change.

## Coordinator handoff

Commit only the fixture and this note; then publish/review through the normal gate.
All logs, reproduction scripts and generated builds are
ignored local artifacts inside this worktree. The incomplete task-owned Linux environment was removed. The task-owned port 8792 server is
stopped at closeout. Keep the ignored reproduction scripts until the #712 evidence
has been copied if the coordinator removes this worktree.

