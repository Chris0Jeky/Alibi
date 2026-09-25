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
puzzles and 130,014 JavaScript gzip bytes, 34 bytes below the fixed cap.

Pulseboard PR #86 merged the release contract at `b01624b`. Its sync and check commands now
register 0.11.6, require the matching `v0.11.6` catalogue tag, and verify the bundled adapter
hash. The candidate's generated Observatory checker and browser bridge were refreshed from
that contract. From Pulseboard's `observatory` directory,
`npm.cmd run check:alibi -- <Alibi checkout>` confirmed the registration. From this Alibi
checkout, `node observatory/check.mjs` and `PYTHONUTF8=1 python tests/browser_observatory.py`
passed; the browser suite reported 24 assertions. The previous hosted Verify run was on pre-fix
head `9ebf813` and failed the real-origin assertion that the initial page view uses the
registered app release. Corrected head `3adfde9db7c68c2c78741a1e99c6090ec0f4cc9c` passed
[Verify puzzle cabinet](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890060) and
[Verify Android payload](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890051). PR #330
merged that source as merge commit `287fc38757d8628bfa8a0b6912adf90aadca0219` after the
independent review found no confirmed CRITICAL/HIGH issue. These checks do not claim a new
deployment, a physical-device check or human difficulty acceptance.

## Publication and delivery

The 0.11.6 source merged to `main` as `287fc38757d8628bfa8a0b6912adf90aadca0219`; no tag,
deployment or public GitHub release has been created. The 0.11.5 Cloudflare and Sites receipts
remain the latest verified deployments.
