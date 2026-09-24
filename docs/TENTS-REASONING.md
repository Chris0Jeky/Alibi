# Tents & Trees reasoning hints

Gameplay slice #323 / #324 extends `AlibiCore.insights.deduction`, following Lanterns in
#322. No hint service, new puzzle solver, save schema or puzzle revisions are introduced.

## Rules and conflict handling

Existing conflicts take priority. For unknown non-tree squares, explain why a square without
an orthogonally adjacent tree must be crossed, or why touching a placed tent at a side or
corner excludes it. Then inspect rows followed by columns. A fulfilled line excludes its
remaining unknown sites; a line requiring every remaining site can force a tent.

Before proposing a forced tent, overlay ALL required tents in that line on a copied board.
Check local quotas, spacing and an injective assignment of placed tents to adjacent trees.
The hint-only `tentConflicts` wrapper reuses `extras.matchTrees` with the two matching sides
reversed: every placed tent needs a distinct tree, but unused trees are normal in partial
play. The existing augmenting-path implementation can reassign earlier pairings; it does not
commit a greedy pairing. The engine validator and completion rules themselves are unchanged.

An impossible overlay returns Revisit a conflict guidance, names the hypothetical line and
violated rule, and asks the player to recheck crosses. The hypothetical board is never
installed, saved, counted as a reveal or added to Undo. Impossible existing tent assignments
also take conflict priority. No applicable rule keeps the existing general-strategy fallback.

This addresses two reviewed published-board cases. On tents-01, an incorrect C1 cross
formerly forced B1 despite column B's zero target. On tents-04, C1 and the proposed C3
competed for the same C2 tree. A separate regression catches adjacent forced sites whose
first tent alone is legal. Hints remain conditional on current marks: partial matching and
local checks do not prove global solvability after arbitrary earlier guesses.

## Evidence

The interrupted candidate 4bad87b passed all five Actions workflows but still had review
findings. Green CI alone was not accepted as permission to merge it. Five added regressions
were observed failing before their respective corrections. The current Tents, Lantern and
shared hint suites pass 25 source tests, with no skipped or failed tests.

The original finite model checks 872 deductions over 880 compatible partial boards on four
selected 3x3 layouts, with independent geometry, counts, spacing and injective matching.
Official Tents walks still check 621 steps with answer access blocked and production reducers.
A second model enumerates arbitrary unknown/cross/tent assignments, including incorrect
crosses and positions without a completion. Its independent local-rule and backtracking
matching checks cover 1,568 locally legal positions: 1,532 proposed moves preserve those
rules, 14 return conflict guidance and 22 have no local hint. A positive matching fixture
requires reassignment and is repeated with reversed tree order to reject a greedy shortcut.

The browser suite retains its 14-step clue-derived route at 390px/1440px. It additionally
enters incorrect C1 through real brush/cell controls, checks pure conflict advice, undoes the
mistake and resumes the correct route. That 30-interaction version passed in run 36060033384.
The latest version also enters the tents-04 shared-tree witness through real controls at both
widths. Its new screenshots and receipts must qualify the latest head; the earlier receipt
is not evidence that this new scenario passed. Python compilation succeeds.

## Size and shared geometry

Formatting was corrected using the pinned formatter's retained output. Build artifact
10833598784 measured 130,112 gzip bytes, 64 bytes over the unchanged 127 KiB application cap.
The matching correction reuses core `groups` for number-hint peers instead of duplicating
row/column/box geometry, shares line/conflict helpers, and shortens repeated explanations and
recaps. An independent comparison retained identical peer sets for 2,210 cells across 54
number boards. Source tests pass, but only a fresh emitted-build measurement can establish
budget compliance. No cap, dependency or workflow gate was weakened.

Local npm registry access remains blocked. No fresh full local build or browser pass is
claimed. Require exact-head full CI, resource budgets, browser receipts and independent
review before merge. Dedicated source checks supplement rather than replace those gates.

## Human acceptance

HUMAN_TODO q-8 remains open. Ask players whether the four explanations and wrong-cross
warnings are clear, whether they can locate the named row/column, and whether Hint/Undo are
comfortable with physical touch, enlarged text and TalkBack. Machine proofs and screenshots
are not human signoff. No deployment or physical-phone freeze resolution is claimed.
