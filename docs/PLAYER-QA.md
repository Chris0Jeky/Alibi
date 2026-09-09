# Player experience and QA plan

Started 2026-09-09 from main `f3414f6`. One coordinator owns implementation;
Terra high supplies an independent interaction audit and later review.

## Objectives and acceptance

1. Browse by game first, then levels. Make thematic filters visible and removable on phones.
2. Put rules and working tools where players notice them. Improve disclosure contrast,
   touch targets and state feedback across the player.
3. Make Sudoku candidates discoverable and indicate fully placed digits. Investigate
   scene candidate letters and board exclusions, retaining undo and saved-state compatibility.
4. Give casebooks a deliberate opening, chapter transition and epilogue with Continue actions.
5. Inventory Sun & Moon boards and sizes; expose existing content and add a bounded,
   independently validated set only if the existing catalogue lacks larger boards.
6. Seed future cases as an editorial backlog, without adding a new casebook this session.

## Iteration protocol

Reproduce with actual controls, select a coherent slice, implement, add behavior regressions,
run required checks and inspect phone/desktop screenshots, then commit. Review the final
candidate independently and publish through the repository's existing gates. Preserve all
published definitions and saves. Wrenmere PRs #39–42 are separate ongoing work.

## Interaction matrix

At phone and desktop widths: home → family → filtered levels → puzzle → back; filter removal;
empty search and reset; first-play and returning-player rules; each family's real controls;
notes, erase, undo/redo and reload; completion and replay; case opening and chapter transitions;
dialog close/focus; keyboard and large text; offline reload and saved progress. Exercise Club
and Quiet Wing navigation/disclosures without conflating their saves with puzzle records.

Record actual checks and failures here as the work progresses. Automated browser simulation,
manual browser interaction, hosted checks and physical-device reports remain distinct.
No finite QA session establishes the absence of every bug.

## Human playtesting

The owner reports two real people have played Alibi and loved it. This is positive qualitative
playtesting evidence and an early product success, not a measured difficulty study. Feedback
received 2026-09-09 requests more/larger Sun & Moon boards, family collections, narrative
chapter pages, completed-digit feedback, and cell candidates/exclusions. It does not explicitly
close the earlier Android freeze retest, TalkBack or sustained-performance acceptance.

Owner acceptance remains in [HUMAN_TODO.md](../HUMAN_TODO.md).

## Implemented and locally exercised

- Family landing with 13 game choices; Browse all retains search and filters. Top-level
  Puzzles clears remembered filters. Each thematic selection has a persistent escape.
- Disclosure styling and mobile control text/targets are clearer. Collection/gallery open state
  survives background rendering; this fixed a reproduced menu-collapse race during installation.
- Existing Sudoku/Futoshiki candidates are labelled Cell notes; digit keys show when all copies
  are placed, with accessible counts and explicit wording that this is not answer verification.
- Scenes have candidate initials, per-person exclusions and independent board X marks. Optional
  bounded state fields preserve old saves. Undo/redo and offline reload retain them. New notes
  require an empty cell; notes underneath later placements reappear when the person is removed.
- Casebooks use opening, revelation and epilogue pages with Continue actions. Chapters remain
  available out of order, completed chapters remain replayable, and unsolved openings hide endings.
- Four 8×8 Sun & Moon boards add 256 cells: 328 total puzzles and 27 in this family. Each has
  one solution under both the production solver and an independent row-enumeration oracle.
  No earlier published definitions were regenerated. Difficulty is provisional; no times invented.

Evidence: full format/build/Node gate; player-feedback real-control matrix at 390/1440;
253 Bellweather/Bridges expedition checks; 92 real-origin storage/offline checks;
66 curation checks; 158 Quiet Wing checks; all After Hours controls pass. Screenshots under
`test-results/player-qa/` include families, Sudoku, scenes, larger boards and story pages.
All 182 original family/UI checks pass, including workshop installation after the catalogue grows. Hosted CI/release results are recorded at closeout.

Manual browser actions separately verified mobile Casebooks → opening → Continue → lesson,
and collection selection → persistent Show all collections → restored full family list.
Phone and desktop screenshots were visually inspected. These are simulated phone viewports,
not claims about a physical phone. A fresh Terra high review found no confirmed blockers after
the occupied-cell annotation guard. Retaining notes under a tentative placement is intentional.

Pre-existing tooling finding: npm audit reports a libheif advisory through Wrangler's nested
Miniflare/sharp dependency. This is build/development tooling, not shipped client JavaScript;
it is recorded for a separate dependency update rather than forcing unrelated package upgrades.
