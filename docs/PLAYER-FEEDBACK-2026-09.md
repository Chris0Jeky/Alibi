# September player feedback: incremental delivery

Source: Elena's 9 September playtest, supplied by the owner on 10 September 2026.
Baseline: main `541ba1e`, published 0.10.1. This is an implementation queue, not a
claim that every request is already delivered. Preserve published definitions and saves.

## Delivery order

| Slice | Outcome and acceptance | State |
| --- | --- | --- |
| 1. Completion | Reproduce inconsistent solved counts across the library, journal, desk and casebooks. Keep an earned completion after restart; separate it from the current board. Test save/reload and replay. | Merged in PR #84 |
| 2. Crime-scene input | Default repeated taps on a square cycle selected person → candidate initial → excluded initial → general X → person. Retain other people's notes through repeated cycles. Hide candidates for placed people without deleting them; restore on removal. Hold square for selected/all clearing; hold person for marking choices. Provide visible keyboard equivalents, undo and reload checks. | Merged in PR #84 |
| 3. Nonogram assistance | Offer reversible crosses when the currently filled runs exactly match a row/column clue. Derive from visible clues, never the solution. Reconsider automatic marks when the premise changes; preserve manual marks and test undo, drag and offline saves. | Merged in PR #84 |
| 4. Larger, harder puzzles | Add bounded 15×15 nonograms; retain classic 9×9 Sudoku and specify larger variants separately (10×10 with 2×5 boxes or 16×16). Audit solver/import/render bounds first. Add new IDs only, independent uniqueness evidence, phone zoom and candidate controls. Expand every family with varied deduction paths and higher difficulty labels backed by human sampling, not board size alone. | Published in 0.11.0; human sampling remains open |
| 5. First-screen hierarchy | Move Winter Gallery sound/motion/edition controls into secondary room settings; demote Screening Room to optional discovery. Keep both reachable and keyboard accessible. Inspect Pocket Borough's entry/action styling at phone and desktop sizes and fix a reproduced inconsistency. | Merged in PR #85. Borough defect not reproduced |
| 6. Sound | Replace the disliked procedural ambience with a small opt-in rain/waves audio trial. Obtain source-specific rights, credits and optimized loop assets; keep silence as default, volume/stop controls and offline fallback. Streaming is optional future enhancement, not required for play; assess provider terms, privacy and embed availability before adding it. Human listening determines comfort. | Merged in PR #87; human listening remains open |
| 7. Recognizable thumbnails | Make each puzzle family visually identifiable before reading its title; use the family board motif as primary image and collection art/stamp as secondary identity. Test mixed-family grids, monochrome/high contrast and small screens. | Merged in PR #85; phone/desktop inspected |
| 8. Longer cases | Verify existing introduction → puzzle → continuation → Continue → puzzle → epilogue flow. Add longer original continuous cases and more books incrementally; distinguish existing standalone anthologies. Coordinate with Wrenmere's existing chapter plan instead of duplicating it. Each new case needs an editorial proof graph, clue/answer consistency, spoiler boundaries and playtesting. | Published in 0.11.0; human sampling remains open |
| 9. Games Room expansion | Separate tested releases: tic-tac-toe; an original block-placement/line-clearing game inspired by the requested Block Blast; Mahjong Solitaire with legal-pair/occlusion rules and solvable layouts; a specifically defined domino game; a region-placement deduction game inspired by the described Mewdoku. Each needs rules, reducer, bounded generation/solver where relevant, accessible controls, lesson, save/reload, undo policy and offline checks. | Published in 0.11.0; human sampling remains open |

## Interpretation and design decisions

- Taps are consecutive actions, not a timed double-click gesture. Keep the selected name stable
  in cycle mode. Existing explicit placement/note/exclusion/X tools remain available.
- Other people's annotations survive a cycle. Candidate visibility is derived from placements;
  the saved candidate list is not destructively pruned when a person moves.
- The owner explicitly permits whichever sizes fit the rules and scale correctly (10 September
  clarification). Retain 9×9 classic Sudoku and select larger variants on solver/UI evidence.
  Higher difficulty and varied reasoning are the objective, not a mandatory 10×10 size.
- The region-game description is ambiguous: one token per row, column and colour normally
  leaves empty cells, whereas “no empty spaces” suggests a different assignment puzzle.
  Implemented as one lantern per row/column/lettered region, no touching, with every square belonging to a region. Most squares stay empty.
- Domino can mean a matching game or a deduction puzzle. Select and document the variant
  before its engine slice. Implemented as classic double-six draw dominoes against a simple offline keeper. New games use original presentation and assets.
- Existing source already contains scene annotations, casebook story pages and family icons.
  Their presence does not establish that players can discover or comfortably use them.

## Verification and release

All feature slices and final release PR #101 are merged and published on both existing origins. Casebook
action wording is corrected and the twelve new Expert definitions have direct control-completion
evidence at phone and desktop widths. The published release is 0.11.0, build `48a8bc3bc1ee`.
Both origins pass persistence/offline, scene/Nonogram interaction, Mahjong completion and the actual
old-to-new saved-game update checks. [The release receipt](RELEASE-0.11.0.md) records their scope.

One writer per checkout, incremental commits, relevant Node and actual-control browser checks,
phone/desktop visual inspection, real-origin checks for saved-state behavior. Independent review
and CI precede merge. Hosted release and physical-device results must be recorded separately.
Do not publish an unreviewed candidate or claim machine uniqueness proves human difficulty.

Owner-only acceptance remains in [HUMAN_TODO.md](../HUMAN_TODO.md), particularly affected-phone
completion, touch ergonomics, TalkBack, sound comfort and difficulty sampling.
