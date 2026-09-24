# Tents & Trees reasoning hints

Gameplay slice #323 / #324 extends `AlibiCore.insights.deduction`, following Lanterns in
#322. No hint service, new solver, save schema or puzzle revisions are introduced.

## Rules and conflict handling

Existing conflict guidance takes priority. For unknown non-tree squares, explain why a
square without an orthogonally adjacent tree must be crossed, or why touching a placed tent
at a side or corner excludes it. Then inspect rows followed by columns. A fulfilled line
excludes remaining unknown sites; a line requiring every remaining site can force a tent.

Before a forced tent is proposed, overlay ALL that line's required tents in a copied board
and run the existing local validator. Perpendicular quotas and spacing must hold together,
not merely for the first tent. A contradiction returns a Revisit a conflict explanation,
names the hypothetical line and violated rule, and asks the player to recheck crosses.
The hypothetical board is never installed, saved, counted as a reveal or added to Undo.

This corrects review 4098104696: crossing C1 in tents-01 after the seven no-tree exclusions
formerly forced B1 despite column B's zero target. A separate regression covers two adjacent
forced sites whose first tent alone is legal. Shared conflict/line-label helpers and the
combined exclusion message reduce duplication without changing deduction order.

No applicable rule means the existing general-strategy fallback. Hints remain conditional
on current marks. Local checks are not a complete solvability test or a proof that earlier
guesses are correct. The helper does not implement matching search, guess or solve every board.

## Evidence

The interrupted candidate's final combined head 4bad87b passed all five Actions workflows,
but still had the above independently reported correctness defect. Green CI alone was not
accepted as permission to merge it.

Three additional regressions were reproduced failing before correction. Together with the
original Tents, Lantern and shared hint suites, 23 source tests now pass. The original finite
model checks 872 deductions over 880 compatible partial boards on four selected 3x3 layouts,
with independent geometry, counts, spacing and injective tree/tent matching. Official Tents
walks still check 621 steps with answer access blocked and real reducers applying each move.

A second independent local-rule checker enumerates arbitrary unknown/cross/tent assignments
for four selected 3x3 layouts, including incorrect crosses and unsatisfiable positions. Among
1,568 locally legal starting positions, all 1,532 suggested moves preserve local rules;
14 produce conflict advice and 22 have no local hint. This is bounded evidence, not exhaustive
coverage of every board size or a complete matching proof for arbitrary marks.

The browser suite retains its 14-step clue-derived route at 390px/1440px. It additionally
enters the incorrect C1 through actual brush/cell controls, reads the conflict without state,
Undo/Redo, reveal-count or completion mutation, undoes the mistake and resumes the original
route. Python compilation passes; fresh browser receipts and screenshots must qualify the
corrected head. The existing workflow retains canonical formatter copies without editing
checked-out sources. Require exact-head full CI and unchanged resource budgets before merge.

Local npm registry access remains blocked; no fresh full local build or browser pass is
claimed. Dedicated source checks supplement, not replace, Actions and independent review.

## Human acceptance

HUMAN_TODO q-8 remains open. Ask players whether the four explanations and wrong-cross
warning are clear, whether they can locate the named row/column, and whether Hint/Undo are
comfortable with physical touch, enlarged text and TalkBack. Machine proofs and screenshots
are not human signoff. No deployment or physical-phone freeze resolution is claimed.
