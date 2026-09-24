# Tents & Trees reasoning hints

Gameplay slice #323 extends the existing `AlibiCore.insights.deduction` seam, following
Lanterns in #322. It adds no hint service, new solver, save schema or puzzle revisions.

## Rules

Existing conflict guidance takes priority. For unknown non-tree squares, explain why a
square without an orthogonally adjacent tree must be crossed, or why touching a placed tent
at a side or corner excludes it. Then inspect rows followed by columns. A line with its full
tent count excludes remaining unknown sites; a line requiring every remaining site forces
a tent at the first one. Tree cells never become proposed moves.

The exclusion pass precedes counting, so impossible sites are crossed before a later count
hint uses them. Return one coordinate and value without changing any state. The existing
Hint dialog remains informational; the player chooses whether to apply a move. Answer-based
reveals remain separate. No applicable rule means the existing general-strategy fallback.

These are deductions conditional on current marks, not certification that earlier guesses
are correct or that the position is solvable. The helper does not infer a permanent tree/tent
pairing, implement a complete matching solver, search for guesses or finish every puzzle.

## Evidence

Seven new regressions plus five existing hint tests pass locally. Six new tests failed before
the implementation. An independent finite model enumerates complete assignments for four
selected 3x3 layouts, checks row/column counts and spacing, and explicitly matches distinct
tents to distinct trees without calling the production matching or geometry helpers. It
checks 872 deductions across 880 compatible partial boards, including ambiguous positions
and column deductions. Official-catalogue walks check 621 steps against verified definitions
with a throwing solution getter, pure hint calls and production reducers.

The browser test follows a 14-step clue-derived prefix of tents-01 at 390px and 1440px. It
covers all four explanations through real Hint, brush, cell and Undo controls, without
injecting saves or reading answers. It checks marks, undo/redo, reveal counts and completion
remain unchanged while reading advice. The existing reasoning workflow now runs both Lantern
and Tents suites; it is not an additional parallel workflow. Receipts/screenshots are retained.

Local npm registry DNS prevents installing the pinned formatter/build dependencies. Python
compilation and focused Node checks pass; `npm test` correctly refuses this source snapshot's
missing checkout identity and fresh Android artifacts. Local Chromium blocks the localhost
origin by policy, so no fresh local browser pass is claimed. Require full exact-head CI,
resource budgets, both browser suites and independent review before merging.

Human acceptance remains separate under HUMAN_TODO q-8: ask a player whether each explanation
is understandable, whether the named square is easy to locate, and whether hints remain
comfortable with physical touch, enlarged text and TalkBack. Do not close those checks using
machine proofs or screenshots. No deployment is part of this change.
