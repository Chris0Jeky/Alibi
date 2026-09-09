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
published definitions and saves. Wrenmere PRs #39–41 are separate ongoing work.

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
