# Lantern reasoning hints

Gameplay slice #321 extends `AlibiCore.insights.deduction` in `src/insights.js`.
The existing Hint dialog renders its rule and explanation. Optional answer-based reveals
remain a separate confirmed action. No new hint controller, save schema or solving service
is introduced.

## Rules and order

Existing conflicts take priority. Otherwise the helper returns at most one deduction:

1. An unknown square already lit along an unobstructed row or column cannot hold a second
   lantern. Cross it out.
2. A numbered wall with its full complement of lanterns excludes its remaining unknown
   neighbours. This includes zero walls.
3. A numbered wall requiring as many lanterns as its remaining unknown neighbours forces
   each of them. Return the first one.
4. An unlit square with only one possible light source forces that source. The square itself
   can be the source; crossed squares can need illumination but cannot become sources.

Visibility and orthogonal adjacency use existing wall-aware engine helpers. Crosses and
already-lit squares are excluded as new sources. The first rule runs before wall counting,
so already-lit unknown neighbours are crossed before a later forced-neighbour hint.

Every rule is conditional on current marks. These local rules are not a satisfiability
oracle, a uniqueness test, a complete solver or an assertion that earlier guesses are right.
When no rule applies, the normal general-strategy fallback remains available. No recursion,
search budget, hidden-answer lookup or automatic marking is introduced.

## Proof and integration

`tests/lightup-insights.test.cjs` contains direct boundary cases and an independent 3x3
exhaustive model. That model implements its own visibility, counts and adjacency, enumerates
all complete assignments, then considers every compatible partial assignment. Each returned
hint must agree with **every** compatible completion, including ambiguous puzzles. It checks
6,588 deductions across 6,977 distinct compatible partial boards for the selected layouts.

Official-catalogue walks wrap the puzzle in a proxy that throws on `solution` access and
check every returned step against the verified answer. They apply marks using the production
reducer and check that asking never mutates state. The current catalogue supplies 477 tested
steps; the test does not claim those four rules finish every board. Seven regressions fail
against the original hint source; eight new and five existing hint tests pass with this slice.

`tests/browser_lightup_hints.py` opens two existing official rooms at 390px and 1440px. Six
clue-derived steps exercise all four rules via actual Hint, brush, square and Undo controls.
It checks the named rule and coordinate and that merely reading a hint does not change
marks, undo/redo, completion or the reveal count. No completed save or hidden solution is
injected. The focused workflow retains screenshots, a JSON receipt and canonical formatting
copies without rewriting checked-out sources. Existing full verification stays authoritative.

Before merge, require exact-head formatting, build/resource budgets, Node, browser/offline,
Android payload and independent review. Local npm registry DNS is unavailable, so no fresh
local browser/build pass is implied. Human explanation quality, physical touch and TalkBack
remain separate HUMAN_TODO acceptance.
