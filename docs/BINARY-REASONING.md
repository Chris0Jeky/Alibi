# Sun & Moon reasoning

Gameplay slice #327 / #329 extends the existing pure Hint seam. It builds on the merged
Tents work in #324 without altering that code, puzzle definitions, givens, saves or reveals.
The initial stacked PR #328 closed when its merged base branch was deleted; #329 continues
the same preserved branch directly against main. No deleted parent branch was recreated.

## Local alternatives, not answer lookup

The old row-first balance/triple helper can suggest a symbol that immediately violates a
perpendicular constraint after an incorrect entry. On binary-03, place a moon at C3; the old
helper suggests a sun at B3 although that move violates the column rule. The corrected helper
reports that neither symbol fits B3 and asks the player to recheck marks.

Visit unknown individual squares, then rows and columns with at most two unknown squares.
Test the two or four assignments on copied cells using the existing binary validator. Retain
only allowed assignment masks and a set of the rules rejecting other assignments. A hint
proposes a value only when all allowed alternatives agree. Its explanation names the examined
coordinates and the involved rules. Listed rules need not reject every alternative separately.

This adds the missing distinct-line deduction: a nearly complete row/column cannot become
a copy of an existing complete line. Quotas, triples and perpendicular constraints are checked
together. If there are no allowed alternatives, return conflict advice without a move value.
If no local test decides a value, retain the general-strategy fallback.

There is no recursive puzzle search, guessing fallback, stored-answer read or automatic move.
This is conditional reasoning from current marks, not proof that every earlier guess is
correct or that the complete puzzle is still solvable. The maximum number of validator calls
per request is 1 + 2n² + 8n, at most 193 on the supported 8x8 maximum. Candidate sets never
contain more than two cells. The runtime creates only copied hypothetical cells, not saves.

## Independent source evidence

Eight new tests were run against the preceding hint source: six fail and two pass. With the
implementation, all eight plus the 25 existing Tents/Lantern/shared hint tests pass, without
skips. The independent complete-board oracle finds 40 compatible answers for each of the
row and transposed-column examples; every answer agrees with the proposed deduction. Thus
these tests exercise genuinely ambiguous partial boards rather than one stored solution.

A deterministic 4x4 sample checks 1,493 returned deductions against all compatible complete
answers across 1,500 partial cases. A separate ternary sample retains 2,050 locally legal
positions, including incorrect marks, and checks that every proposed move preserves its
independently implemented counts, triples and distinct-line rules. These are bounded samples,
not exhaustive coverage of all board sizes. Official-catalogue walks verify 458 deductions
with throwing solution getters, immutable hint calls, preserved givens and real reducers.

The source test also traps puzzle-solver calls and counts local validation on an empty 8x8
board. Tests contain the explicit binary-03 wrong-C3 regression and row/column transposition.

## Real-control acceptance and continuation

`tests/browser_binary_hints.py` opens curated-binary-01 at 390px and 1440px, follows twelve
clue-derived steps through Hint/symbol/cell/Undo controls and requires a distinct-line
explanation at the final step. It then enters the wrong C3 on binary-03, checks pure conflict
advice and undoes the mistake. No player record is injected. Python compilation passes.

Initial head caa87ee passed run 36066440056. Downloaded artifact 10836218226 records all 26
binary interactions and the 44 existing Tents/Lantern interactions, with no page errors. The
phone distinct-line and wrong-mark screenshots were inspected. Canonical formatter output
was applied without changing rules or assertions; the combined 33 source tests pass.

Artifact 10836274708 on head fd9360c measured 130,194 gzip bytes, 146 above the unchanged
127 KiB application cap. The compact follow-up removes trial objects and repeated filtering,
retains only small assignment masks and shortens duplicate wording. All 33 source tests pass
again, including official hint routes and the call bound. Only the final emitted artifact and
full CI can establish budget compliance; source-only compression estimates are not acceptance.

The existing reasoning workflow runs Lantern, Tents and binary controls in the same lane and
retains screenshots, receipts and non-mutating pinned formatter output. Full exact-head
formatting, emitted resource budgets, browser/offline and Android checks must pass alongside
independent review before merge. No existing cap, dependency or merge check is relaxed.

Local dependency and origin restrictions prevent claiming a fresh full local build or browser
pass. Source proofs supplement GitHub Actions. Keep HUMAN_TODO q-8 and #161 open for explanation
quality, physical touch/TalkBack and human difficulty acceptance. This is not a deployment.
