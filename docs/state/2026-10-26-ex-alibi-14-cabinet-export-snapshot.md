# Cabinet export reads one committed snapshot

Branch: `sol/ex-alibi-14`; starting HEAD: `a1d7c7115c3828d5317accbf04b6578a561323f8`.
Changes remain uncommitted for the coordinator. No Git write commands, publication,
deployment, published content edits or gate/authority changes are part of this slice.
At selection, #579 was the only open PR; recent merges #764-#770 were checked to
avoid duplicating their save-retention, validation-worker and menu work.

## Changed

`Store.export()` now queues runs, packs, settings, preferences and workshop-draft
reads in one readonly IndexedDB transaction and waits for its completion. A
concurrent atomic replacement can no longer produce an export combining old runs
with new packs and metadata. An aborted read cannot produce a successful backup.
Local/session fallback behavior and backup formats remain unchanged.

Export and restore share their existing snapshot request/value conversion and
backup envelope construction to stay within the unchanged shell budget. The two
affected Node fixtures now model transaction completion after their pending reads;
one previously omitted completion, and another used a fixed 20 ms completion timer.
The browser-origin runner includes the new scenario in its full scenario set.

## Verified

- Installed the locked dependencies with `npm.cmd ci`: zero reported vulnerabilities.
- Clean starting baseline: `npm.cmd run verify` passed; Node: 2,125 tests,
  2,107 passed, 18 skipped, zero failures. Quiet engines: 581,856 assertions;
  Quiet storage/contracts: 123 assertions.
- `npm.cmd run build`: final changed-source web build `0d2a4c7c62d6`.
- `node --test tests/storage-legacy-recovery.test.cjs tests/storage-restore.test.cjs tests/storage-revision.test.cjs tests/storage-readonly.test.cjs`:
  82 passed, zero failures.
- Final combined seam check:
  `node --test --test-concurrency=2 tests/storage*.test.cjs tests/backup*.test.cjs tests/restore*.test.cjs tests/budget.test.cjs tests/package.test.cjs`:
  173 passed, zero failures/skips/cancellations; storage script also reports 58 assertions.
- `node --test tests/budget.test.cjs`: 15 passed. Shell: 1,419,704 bytes under
  1,419,736.32; no ceiling changed. The clean-source identity adds one byte.
- `py -3 tests/browser_origin.py` with `ALIBI_URL=http://127.0.0.1:8794/` and `PYTHONUTF8=1`:
  all 19 scenarios passed, 638 assertions, no uncaught page errors, final web build
  `0d2a4c7c62d6`; disposable Chromium profiles only. The local server was stopped.
- `npm.cmd run format:check` and `git diff --check`: passed.
- Fails-without-fix proof: ran the final browser scenario with the original
  `git show HEAD:src/storage.js` evaluated in the disposable Chromium page.
  It failed with run `before`, pack `after`, sound false, favorite `snapshot-after`
  and draft `after`. The fixed production code passes the snapshot and abort checks.
  Reproduce against a local server with
  `py -3 -X utf8 test-results/prove-cabinet-snapshot-original.py` (expected exit 1).
  This ignored proof script pins the original storage source to the starting SHA.
  The server command used was `$env:PORT='8794'; node tools/serve.cjs`.
- Logs/reports stay ignored under `tests/ex-alibi-14-*.log` and `test-results/`.

## NOT verified

The Android build correctly refuses the uncommitted source tree; its artifact
tests and `npm test` preflight require the coordinator's commit and fresh
`npm.cmd run verify`. No guard was disabled or clean identity fabricated.
The broader direct post-edit Node run omitted `tests/android-build.test.cjs` but
still reached the seven Android content-manifest tests, which use the same dirty
source guard. Those artifact checks are not a green final-source receipt.
That broad run was stopped after identifying this prerequisite; the complete
focused storage/backup/restore, budget and package-contract suites were run instead.
No final-head hosted CI, review, deployment, native runtime or physical-device
acceptance is claimed. See [HUMAN_TODO.md](../../HUMAN_TODO.md), including the
physical Android/TalkBack and affected-device freeze checks; none is closed here.

## Residual risk

Chromium provides the real IndexedDB concurrency/abort proof. Other browser engines
and physical devices remain untested. Shell headroom is about 31 bytes after a
clean identity, so the coordinator must remeasure the integrated committed tree.
