# Block Cabinet menu during pending undo saves

Branch: `sol/ex-alibi-13`; starting HEAD: `0ecce535f08585711f7e2ea26ee870882888cffd`.
Worktree: `C:/Users/jekyt/Desktop/Printer Config/Others/Git/Alibi/.wt/ex-alibi-13`.

## Changed

The enabled Game menu button previously ignored clicks while an undo save was
pending, leaving an open landscape menu expanded. `surface.mjs` now allows only
the presentation-only menu command through the pending guard. Replay mutations
remain blocked. No save format, dependency, published content or gate changes.

The regression in `tests/browser_mobile_qa.py` makes a real placement and undo,
holds the adapter's flush-completion boundary after the actual save queue
settles, and closes/reopens the menu three times at 667x375 and 844x390. It checks
expanded state, visibility, disabled game controls, unchanged replay and pending
state, then releases the hold and proves redo still works. Cleanup releases the
hold even when an assertion fails.

## Verified

- Before editing, `npm.cmd run verify` exited 0: 2,117 Node tests, 2,099 passed,
  18 skipped, zero failed, plus both Quiet Wing suites.
- Before the fix, `py -3 tests/browser_mobile_qa.py
  MobileQA.test_block_landscape_menu_responds_while_undo_save_is_pending`
  failed at both sizes: expected `aria-expanded=false`, actual `true`. This
  exercised the old built application with the new regression, not a mock menu.
- After `npm.cmd run build`, the regression and original landscape case pass:
  `py -3 tests/browser_mobile_qa.py
  MobileQA.test_block_landscape_menu_responds_while_undo_save_is_pending
  MobileQA.test_block_cabinet_landscape_board_tray_and_exit` (2 tests).
- `py -3 tests/browser_mobile_qa.py`: all 20 tests pass against stable build files.
- `py -3 tests/browser_ui.py`: all 187 checks pass.
- `py -3 tests/browser_block_motion.py`: all 90 checks pass at 390/1280px,
  including offline reload, motion, replay persistence and stale-writer rejection.
- `node --test tests/block-cabinet.test.cjs
  tests/block-cabinet-phone-actions.test.cjs tests/block-motion.test.mjs
  tests/block-motion-delivery.test.cjs tests/block-replay-cache.test.cjs
  tests/block-replay-long.test.cjs tests/block-replay-cap.test.cjs`: 42/42 pass.
- Baseline `py -3 tests/browser_september_feedback.py` passes at 390 and 1440px.
- Formatting passed in the final verify invocation; Python compilation and
  `git diff --check` pass.

Browser commands use `PYTHONUTF8=1` and
`ALIBI_URL=http://127.0.0.1:8796`, served from this worktree's `dist/` by
`$env:PORT='8796'; node tools/serve.cjs`. Tooling is Node 24.13.1,
Python 3.14.3 and Playwright 1.62.0. Generated build files, screenshots and logs
remain ignored. Phone landscape and desktop Block Cabinet screenshots were
visually inspected.

## NOT verified

The post-edit `npm.cmd run verify` passes formatting and web build, then refuses
Android derivation with `Android builds require a clean source tree.` The user
explicitly prohibited Git writes and assigned commit/push/PR creation to the
coordinator. No guard was bypassed. The coordinator must commit the scoped diff
and rerun `npm.cmd run verify`, then qualify the PR under its normal review/CI
gate. The green baseline does not establish a green final full gate.

The first full mobile run had three boot-readiness timeouts while I overlapped
it with the verify web rebuild. That run remains failed; the subsequent stable
build run passed all 20 tests. No timeout/assertion was relaxed.

## Residual risk

This is a deterministic user-reachable pending-command bug related to #417,
not proof of that historical intermittent failure's exact cause. #417 and #712
remain open; retained Scene traces do not yet establish its click-suppression
cause. No deployment, installed-native, physical Android or TalkBack acceptance
is claimed. Existing owner actions in [HUMAN_TODO.md](../../HUMAN_TODO.md),
including physical acceptance, remain unchanged. No Git writes were performed
by this session; the coordinator owns commit, publication and worktree cleanup.
