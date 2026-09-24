# Live development state

## Gameplay continuation: 24 September 2026, evening

This checkpoint starts from main `753b5d0476b79abde633a579227264556f996380`.
It records source work, not a deployment. Live GitHub takes precedence for later PR status.
The previous STATE is preserved byte-for-byte in
[the gameplay-base archive](STATE-ARCHIVE-2026-09-24-GAMEPLAY-BASE.md), including all earlier
maintenance, source/CI, hosted-origin, Android preview and rollback references.

### Landed gameplay

#317 fixed Archive map occupants, missing rows, completion and board-edge handling, preserving
all nine rooms and replay identities. It merged as `12817918456cff0b4d92ac61e59ccc2126e1aeed`.
#322 added four answer-independent Lantern deductions and merged as
`753b5d0476b79abde633a579227264556f996380`. Both had full exact-head verification, independent
review and unchanged-head checks before merge. Their PRs retain detailed evidence.

### Picture Logic expansion, #319 / #320

Six original revision-1 15x15 pictures propose 382 source puzzles across 23 trusted packs.
All earlier 376 definitions remain unchanged. Labels are provisional, not human calibration.
The first full Verify failed in `browser_expert_families.py`: its fixed 21-card Expert count
could not include the two new Expert boards (actual 23). This was not an origin-storage or
puzzle-solver failure. The complete log was recovered as artifact `10829779903`.

Head `9d156c64f3cfeccc50c6c92eff375f6d33987df5` derives expected Expert revision keys from the
trusted registry and checks exact displayed membership as well as count. The temporary log
collection job was removed; no extra Actions permission or weakened verification remains.
All five workflows passed on that head. Review then identified the 24-card pagination
boundary; head `2ce1807f90998fa2478b019e2df73aff55865fc4` also expands Show more before exact
membership checks. Five controlled list sizes and a non-progressing control were checked.
Require that final head's full CI and review before merging. Keep #161 and human q-8 open.

### Tents reasoning, #323

Four local rules extend the existing hint seam: tree adjacency, tent spacing, fulfilled line
counts and forced remaining sites. Seven new plus five existing source tests pass, including
872 independently checked deductions over 880 compatible small-board states and 621 official
steps with answer access blocked. See [TENTS-REASONING.md](TENTS-REASONING.md).
The existing reasoning browser workflow now checks Lantern and Tents controls. Require its
receipts, full exact-head CI/budgets and independent review before merge. No complete-solver,
automatic-move, save-schema or puzzle-revision change is introduced.

A later bundle check measured 130,141 gzip bytes, 93 bytes over the unchanged 127 KiB limit.
Shorter explanations for Tents, Lanterns and number hints preserve their rules and reduce the
actual emitted bundle to 130,029 bytes on head `7a5b744`. Twenty combined hint source tests and
both reasoning browser suites pass. The separate historical phone-action warning below was
restored after its existing source test caught the loss from the condensed handoff.

### Reversi search boundary, #325 / #326

The engine accepted fractional depths that never reached the recursive zero-depth stop.
Three new regressions reproduce the defect on a bounded seven-empty-square endgame. Head
`541209500f2f0f24eb09602e1d66249565829038` normalizes invalid values to four and retains the
existing one-to-five integer clamp. Nine Reversi/Club/challenge subtests pass locally; the
published corrected source blob matches the tested bytes. Require final-head CI and review.
The shipped worker uses depth four, so this is not a reproduction of the reported phone freeze.
No game rules, replay versions or published Archive layouts changed.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The historical candidate and proving checks remain in the linked gameplay-base archive;
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither newer source proofs nor browser screenshots turn that candidate into a device signoff.

## Evidence and remaining boundaries

The local workspace is an uploaded source ZIP reconciled at changed seams, not a fresh full
checkout/build of main. npm registry DNS and local Chromium origin policy block full local
verification. Focused Node checks and Python compilation supplement GitHub Actions; they do
not replace full build, browser, offline or Android payload gates.

Version 0.11.5's published 376-puzzle release and the separate Cloudflare/Sites origin receipts
remain dated history in [RELEASE-0.11.5.md](RELEASE-0.11.5.md) and the state archives. No new
hosted-origin probe, deployment, rollback, store submission or physical-device acceptance is
claimed. Android remains a non-publishable preview; the Capacitor owner gates remain open.

[HUMAN_TODO.md](../HUMAN_TODO.md) retains device, TalkBack, difficulty, recognizability and
explanation-quality acceptance. #281/#282 still require the maintainer architecture skim;
source tests do not approve that ADR. Review live open PRs before overlapping another lane.
