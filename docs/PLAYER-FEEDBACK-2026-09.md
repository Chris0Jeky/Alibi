# September player feedback: incremental delivery

Source: Elena's 9 September playtest, supplied by the owner on 10 September 2026.
Baseline: main `541ba1e`, published 0.10.1. This is an implementation queue, not a
claim that every request is already delivered. Preserve published definitions and saves.

## Delivery order

| Slice | Outcome and acceptance | State |
| --- | --- | --- |
| 1. Completion | Reproduce inconsistent solved counts across the library, journal, desk and casebooks. Keep an earned completion after restart; separate it from the current board. Test save/reload and replay. | Investigating |
| 2. Crime-scene input | Default repeated taps on a square cycle selected person → candidate initial → excluded initial → general X → person. Retain other people's notes through repeated cycles. Hide candidates for placed people without deleting them; restore on removal. Hold square for selected/all clearing; hold person for marking choices. Provide visible keyboard equivalents, undo and reload checks. | Implementing |
| 3. Nonogram assistance | Offer reversible crosses when the currently filled runs exactly match a row/column clue. Derive from visible clues, never the solution. Reconsider automatic marks when the premise changes; preserve manual marks and test undo, drag and offline saves. | Planned |
| 4. Larger, harder puzzles | Add bounded 15×15 nonograms; retain classic 9×9 Sudoku and specify larger variants separately (10×10 with 2×5 boxes or 16×16). Audit solver/import/render bounds first. Add new IDs only, independent uniqueness evidence, phone zoom and candidate controls. Expand every family with varied deduction paths and higher difficulty labels backed by human sampling, not board size alone. | Planned |
| 5. First-screen hierarchy | Move Winter Gallery sound/motion/edition controls into secondary room settings; demote Screening Room to optional discovery. Keep both reachable and keyboard accessible. Inspect Pocket Borough's entry/action styling at phone and desktop sizes and fix a reproduced inconsistency. | Planned |
| 6. Sound | Replace the disliked procedural ambience with a small opt-in rain/waves audio trial. Obtain source-specific rights, credits and optimized loop assets; keep silence as default, volume/stop controls and offline fallback. Streaming is optional future enhancement, not required for play; assess provider terms, privacy and embed availability before adding it. Human listening determines comfort. | Planned |
| 7. Recognizable thumbnails | Make each puzzle family visually identifiable before reading its title; use the family board motif as primary image and collection art/stamp as secondary identity. Test mixed-family grids, monochrome/high contrast and small screens. | Planned |
| 8. Longer cases | Verify existing introduction → puzzle → continuation → Continue → puzzle → epilogue flow. Add longer original continuous cases and more books incrementally; distinguish existing standalone anthologies. Coordinate with Wrenmere's existing chapter plan instead of duplicating it. Each new case needs an editorial proof graph, clue/answer consistency, spoiler boundaries and playtesting. | Planned |
| 9. Games Room expansion | Separate tested releases: tic-tac-toe; an original block-placement/line-clearing game inspired by the requested Block Blast; Mahjong Solitaire with legal-pair/occlusion rules and solvable layouts; a specifically defined domino game; a region-placement deduction game inspired by the described Mewdoku. Each needs rules, reducer, bounded generation/solver where relevant, accessible controls, lesson, save/reload, undo policy and offline checks. | Planned |

## Interpretation and design decisions

- Taps are consecutive actions, not a timed double-click gesture. Keep the selected name stable
  in cycle mode. Existing explicit placement/note/exclusion/X tools remain available.
- Other people's annotations survive a cycle. Candidate visibility is derived from placements;
  the saved candidate list is not destructively pruned when a person moves.
- “Standard 10×10 Sudoku” is treated as a desire for larger and harder puzzles. Classic is
  9×9; a 10×10 variant requires an explicit ten-symbol/box design and supporting UI.
- The region-game description is ambiguous: one token per row, column and colour normally
  leaves empty cells, whereas “no empty spaces” suggests a different assignment puzzle.
  Specify the rule set before implementation; do not silently invent contradictory rules.
- Domino can mean a matching game or a deduction puzzle. Select and document the variant
  before its engine slice. New games use original presentation and assets.
- Existing source already contains scene annotations, casebook story pages and family icons.
  Their presence does not establish that players can discover or comfortably use them.

## Verification and release

One writer per checkout, incremental commits, relevant Node and actual-control browser checks,
phone/desktop visual inspection, real-origin checks for saved-state behavior. Independent review
and CI precede merge. Hosted release and physical-device results must be recorded separately.
Do not publish an unreviewed candidate or claim machine uniqueness proves human difficulty.

Owner-only acceptance remains in [HUMAN_TODO.md](../HUMAN_TODO.md), particularly affected-phone
completion, touch ergonomics, TalkBack, sound comfort and difficulty sampling.
