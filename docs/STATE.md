# Live development state

## Repository and release checkpoint: 25 September 2026

The primary `main` checkout is tracked-clean at `e557763`, after #313 and #316 merged with
merge commits. #318 is the remaining wait-suite PR; its refreshed exact head `272b1aa9f` has
one full `verify` workflow still running. #281 remains draft for maintainer architecture
acceptance. #329 remains draft because the exact remote build exceeds the unchanged JavaScript
gzip cap; its local Muse worktree and measured result are recorded in
[the repository sweep](REPO-SWEEP-2026-09-25.md).

The 0.11.5 source is still the latest deployed release. The source catalogue contains 382
puzzles across 23 packs. Release candidate branch `codex/release-0.11.6` prepares the six new
Picture Logic studies, Lantern and Tents hint improvements, Archive boundary corrections and
the Reversi depth fix. Its release record keeps the new picture difficulty labels provisional.
The candidate is not merged, tagged or deployed. `HUMAN_TODO.md` q-1 through q-8 remain open,
including source licensing, physical Android/TalkBack checks and human calibration.

The primary checkout's tracked files are clean. The 25 September branch, pull-request and
worktree dispositions are in [the repository sweep](REPO-SWEEP-2026-09-25.md); ignored build
outputs and dirty review worktrees remain preserved.

## Source reconciliation checkpoint: 24 September 2026

This working tree starts from main `6da00fcd701a4ffa4ed01614e16cc8752fa1032c`, after
Tents reasoning PR #324 merged. A clean main checkout passed `npm.cmd run verify` at that
commit: 519 passed, 3 skipped and 0 failed; the emitted JavaScript measured 130,012 gzip
bytes, below the existing 127 KiB cap. The build still identifies the source version as
0.11.5; this is a source checkpoint, not a new release or deployment.

House wait PR #311 includes child #315. Their combined changes replace fixed sleeps with
predicate waits for route and restored opener focus, and add three Node regressions that
execute the actual browser predicates. The two House browser suites keep their existing
focus assertions. See PR #311 for exact-head CI and review receipts; source-level predicates
do not establish physical-browser, phone, or accessibility acceptance.

The 24 September Muse wait branches #313, #316 and #318 are being requalified against current
main. PR #281 remains draft pending its maintainer architecture acceptance. Human acceptance
for physical Android/TalkBack use and provisional puzzle calibration remains open in
`HUMAN_TODO.md`.

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

House child #315 joined #311 as `2a5fca0f266ca424d694c5c2e86d7f310d66fbca`. Earlier source
checkpoints below remain dated history; live GitHub status and PR #311 hold the latest
combined-head CI and review receipts.

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
