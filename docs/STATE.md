# Live development state

## Sun & Moon continuation: 24 September 2026, after 22:00 UTC

#324 is merged on main as `6da00fcd701a4ffa4ed01614e16cc8752fa1032c`. Its final head
9abb460 passed full Verify 36064801293, Android 36064801385, reasoning controls 36064801296
and Picture Logic controls 36064801408. Independent review 5823009386 found no major issues;
all three inline findings have evidence replies and are resolved. Downloaded artifact
10836240335 confirms 32 Tents plus 12 Lantern interactions with no page errors. This closes
the source work in #323, not #161 or physical/human acceptance. The merged tree exactly
matches the reviewed head; no unpublished source is substituted.

#327 / #328 adds Sun & Moon distinct-line and contradictory-mark reasoning. It tests at most
two unknown cells at a time using the existing local validator, never the stored answer or
puzzle solver. Six of the eight regressions fail against 9abb460; all eight plus 25 existing
hint tests pass after the change. Independent oracles verify ambiguous-board deductions and
2,050 arbitrary locally legal positions; official walks check 458 steps through reducers.
See [BINARY-REASONING.md](BINARY-REASONING.md) for bounds and conditional-soundness limits.

The initial #328 head caa87ee passed all 26 new phone/desktop browser interactions plus the
44 existing Tents/Lantern interactions in run 36066440056, artifact 10836218226. Real controls
cover distinct-line advice, wrong-C3 conflict guidance and Undo recovery. Phone screenshots
were inspected. Pinned formatter output was applied without changing rules or assertions;
33 source tests still pass. The formatted, current-main-based head must pass fresh full CI,
resource budgets and independent review before merge. Initial browser success is not a
substitute for that final gate. No dependency, cap, save, puzzle revision or deployment change.

Local source execution uses the uploaded ZIP reconciled at changed seams, not a fresh full
checkout/build. npm/origin restrictions still prevent a claimed full local browser build.
Keep HUMAN_TODO q-8 open for explanation quality, physical touch/TalkBack and human difficulty.
The checkpoints below are preserved history; latest GitHub status takes precedence.

## Matching and review continuation: 24 September 2026

The Tents review also identified a distinct shared-tree witness on tents-04. The latest
hint-only correction uses the existing augmenting-path matcher with its sides reversed,
requiring each placed or forced tent to have a distinct adjacent tree. It checks existing
assignments and the whole hypothetical forced set, without changing engine validation,
reading stored answers, installing hypothetical marks or adding a puzzle-search fallback.
Two further tests were observed failing before correction; 25 hint tests now pass. The
independent arbitrary-mark model additionally checks partial matching, and a positive case
requires reassignment rather than greedy pairing. The 621 official steps remain unchanged.

The wrong-C1 browser/Undo scenario passed at both widths in run 36060033384. The new shared-
tree browser scenario and current emitted bundle still need latest-head CI. The formatted
predecessor c70faaf built at 130,112 gzip bytes, 64 bytes over the unchanged cap. Reusing core
number-grid groups and reducing repeated wording addresses size without removing rules or
raising limits; 2,210 peer sets across 54 number boards matched the earlier geometry. See
[TENTS-REASONING.md](TENTS-REASONING.md) for limits and exact evidence scope.

House child #315 merged into the #311 branch as 2a5fca0f266ca424d694c5c2e86d7f310d66fbca,
NOT into main. Its exact-head full/mobile checks and independent reviews passed. Parent #311
must retain current main and STATE, then pass fresh combined-head checks before integration.
Earlier source checkpoints below remain dated history; latest GitHub status takes precedence.

## Latest continuation: 24 September 2026, after 21:00 UTC

The source baseline is now main `93852f76a3b3014d463a6dab55b7d657efc836ef`.
#320 merged as `db4925fb28f5e1dce348f7d53712722005605ed4` after final-head full Verify,
four dedicated lanes and independent review. All four inline findings were addressed.
The source catalogue is 382 puzzles across 23 packs, including 40 Picture Logic entries;
the six new pictures remain provisionally rated. #161 and q-8 stay open.
#326 merged as `93852f76a3b3014d463a6dab55b7d657efc836ef` after full Verify, Android payload
and independent review. It normalizes Reversi depth without changing the normal worker path.

#324's combined head 4bad87b also completed all five workflows, but review 4098104696 found
that incorrect crosses could force a tent into a fulfilled perpendicular line. The correction
validates the whole forced set on a copied board and reports the conflict instead of a move.
Three new regressions failed before the fix. The current 23-test hint run passes, retaining
872 compatible-board deductions and 621 official Tents steps. An independent arbitrary-mark
check covers 1,568 locally legal positions: 1,532 safe moves, 14 conflicts and 22 fallbacks.
The browser route adds wrong-cross advice, no-mutation checks, Undo and resumed valid play
at both 390px and 1440px. Python compilation passes. See TENTS-REASONING.md.

Require the corrected head's exact CI, current bundle budget and independent review; older
4bad87b results do not qualify new bytes. No published puzzle, save schema, dependency,
resource cap or deployment changes are part of this continuation. Local npm registry access
was retried and remains blocked. Full local build/browser success is not claimed.

The earlier checkpoint below is retained as dated history. Its pending-merge statements are
superseded by the latest continuation above, not erased from the evidence trail.

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
