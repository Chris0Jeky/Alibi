# Objects after closing: Picture Logic studies

Source candidate for #319, related to the player-requested expansion in #161.
The pack is additive to the six Crime Scene variations and nine-family studies
already merged in #226 and #229. It does not replace that work or close human
curation acceptance.

## Content and intended solve paths

All six entries are new, original 15×15 pixel drawings, authored in this work.
No imported puzzle, third-party artwork, rotated catalogue board or generation
seed is a runtime dependency. The source arrays and their run clues are the
reproducible definitions. Titles and visual symmetry are not extra puzzle rules.

| ID suffix | Drawing | Candidate label | Intended reasoning |
| --- | --- | --- | --- |
| 01 | The keeper's lantern | Tricky | Establish the stand and outer margins, cross the glass-frame columns, then separate flame and handle. |
| 02 | Three at the clock tower | Expert | Start with a sparse rim/hand overlap; repeatedly transfer information between curved boundary fragments and hour marks. |
| 03 | The diagonal key | Expert | Use the ring and empty margins to constrain the diagonal shaft; resolve the uneven teeth from crossing short runs. |
| 04 | The suspension footbridge | Tricky | The deck anchors the towers; distinguish hanging vertical rods from sloping cables and finish the abutments. |
| 05 | The last grains | Tricky | Resolve the frame and sand masses, then use individual clues, not symmetry, for the uneven falling grains. |
| 06 | The open register | Tricky | Find spine/page edges, then alternate columns through different short text strokes on the two pages. |

IDs are `keepers-picture-01` through `keepers-picture-06`, each revision 1.
Labels remain **provisional**. There are four Tricky and two Expert candidates;
no Gentle or Steady entries were added. These labels are editorial judgments,
not measured player difficulty, solving times or enjoyment.

## Machine evidence and review corrections

The independent Nonogram oracle and the native bounded solver both find exactly
one answer per board. With `solution` hidden behind a throwing getter, the existing
hint engine accounts for all 225 squares of each board using only run clues and
current marks. Every hint is checked against the independently verified answer,
then applied through the production reducer. Asking for a hint must not mutate
state. This is 1,350 explicit cell deductions, not an answer-reveal walkthrough.

A development probe also applied all currently forced row/column consensus cells
simultaneously, repeating until stable. The lantern, clock, key, bridge, sandglass
and register needed respectively 9, 12, 11, 5, 9 and 5 rounds. Initial forced-square
counts were 94, 17, 48, 60, 99 and 62 out of 225. These are structural observations
under that precise algorithm, not a human difficulty scale. The committed tests
prove the actual one-cell-at-a-time production hint route rather than depending
on those probe metrics.

Review discarded an ambiguous sandglass sketch and revised a clock and key that
initially stalled under line-only deduction. The final asymmetric grain and key
teeth must not be mirrored by a future art cleanup. Tests reject every rotation
and reflection of another official Nonogram, including the five sibling studies.

The aggregate is 382 source puzzles across 23 trusted packs. A canonical SHA-256
assertion preserves all 376 earlier complete puzzle definitions, not just their
IDs. The pack, registry and count assertions change; engine rules, saves, earlier
revisions, dependencies and resource budgets do not. Version 0.11.5's published
376-puzzle release remains a historical fact; this PR does not deploy a release.

## Verification and continuation

Source checks:

```sh
node --test tests/picture-logic-collection.test.cjs tests/official-catalogue.test.cjs tests/master-grandmaster-studies.test.cjs tests/insights.test.cjs
```

`tests/browser_picture_controls.py` reuses the existing real-control helpers. It
opens every new board at 390px and 1440px, checks visible hit targets and horizontal
page overflow, mutates and undoes a move, completes the board through DOM controls,
then reloads offline and requires the same saved completion identity. Its focused
Actions workflow builds the real web artifact and retains receipts/screenshots.
No test inserts completed player records or calls a runtime answer-reveal action.

The initial source run passes 17 tests. Local dependency installation failed on
registry DNS; local `npm run verify` stops at missing Prettier, while `npm test`
correctly refuses absent/stale web and Android artifacts. Full formatting, build,
size budgets, browser/offline and Android verification therefore belong to the
latest PR head's Actions, not to a claimed fresh local build. The dedicated browser
lane is additive; no existing merge gate is weakened.

Before merge, inspect full exact-head CI, the new browser receipts, independent
review and head aging. Before treating difficulty as calibrated, use the existing
`PLAYTEST_TEMPLATE.md` and `HUMAN_TODO.md` q-8 to record perceived difficulty,
recognizability, clue readability, actual Android touch/pan comfort, TalkBack and
sustained performance. Browser emulation cannot close those gates. Keep #161 open.
