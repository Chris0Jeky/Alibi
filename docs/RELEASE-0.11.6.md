# 0.11.6: A larger picture collection, clearer hints

Source release candidate prepared 2026-09-25 from the changes merged after 0.11.5.
It contains six original 15×15 Picture Logic studies, the Lantern and Tents hint
improvements, Archive boundary corrections and a bounded Reversi depth fix. The
source catalogue now contains 382 puzzles across 23 packs.

The four Tricky and two Expert labels on the new pictures remain provisional. Human
calibration, recognizability, physical touch and TalkBack acceptance remain open under
`HUMAN_TODO.md` q-8. Existing puzzle IDs, revisions, save formats and database versions
are unchanged.

## Candidate verification

The local `npm.cmd run verify` gate passed on 25 September: formatting, the Android preview
build, 526 Node tests (523 passed, 3 skipped, 0 failed), and both Quiet Wing suites (581,847
and 29 assertions). The emitted 0.11.6 Android preview records `sourceDirty: false`, 382
puzzles and 130,012 JavaScript gzip bytes, 36 bytes below the fixed cap. This is local evidence; the candidate still needs
exact-head hosted CI and independent review before merge. It does not claim a new deployment,
a hosted-origin check, a physical-device check or human difficulty acceptance.

## Publication and delivery

No 0.11.6 deployment or public GitHub release has been recorded yet. The 0.11.5 Cloudflare
and Sites receipts remain the latest verified deployments.
