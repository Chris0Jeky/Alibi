# Alibi 0.9.1 · Keep your place

Published 2026-09-09 from `8641b3e385f663af6be3ca138aa948d6b355c591` (PR #70).
Build `efb6b034ac62`; 328 puzzles, thirteen families, four casebooks.

The iterative QA pass reproduced puzzle-panel overflow at 320px with large text: a 296px
content area was forced to 314.84px. Grid children can now shrink to their available space.
The regression covers normal/large text, contrast, small and full Sudoku boards, crime scenes
and aquariums across 320px, 390px, short landscape and desktop layouts.

The same visual pass found 8px mobile Desk assistant labels and 28–32px targets despite the
large-text setting. Those controls now use relative type (at least 14px in the tested settings),
44px targets and wrapping. Actual candidate selection and help-dialog controls pass alongside
the layout assertions; neither assistance rules nor player notes change.

Library filters retain keyboard focus and pagination focuses the first newly shown puzzle.
The local/CI actual-control regression passes filtering, all pages, search and history.
The primary hosted pagination check exposed a remaining timing-dependent focus loss while
showing 168 cards. A background-render investigation is separate follow-up work; this release
does not claim that the hosted library keyboard matrix passes.

The player-facing history includes this patch and all earlier entries. No puzzle definition,
revision, storage identity or content count changes. Generator preservation and the test-only
asset timeout fixture are maintenance work, separate from player state.

## Publication and verification

Both complete CI runs passed at the reviewed head: [push](https://github.com/Chris0Jeky/Alibi/actions/runs/34405586763)
and [PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34405694440). Independent review found no
confirmed blocker. An alleged normal-text regression was disproved by the final CSS cascade
and measurements (14px normal, 14.875px large; all assistant targets at least 44px).

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `6c70ed0d-3818-4d09-9854-6ba0b45c43a2`; all 254 public files match the release.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 10,
  deployment `appgdep_6aa1cf1b3c408191be9135cc7ae2098c`; all 250 non-HTML files match.
  Four HTML files retain exact source plus the known 938-byte hosting challenge script.
- Each live origin passes 92 real storage/offline checks. Primary discovery/history passes
  20 actual-control checks; the expanded primary narrow-layout/assistant matrix passes.
- Disposable saves on both origins pass the actual 0.9.0-to-0.9.1 Check for updates / Save &
  update flow: an extra move before activation, exact state and pinned definition after activation,
  and offline reload. This is actual hosted update evidence, separate from simulated local releases.
- Final source verification and 182 UI checks pass locally. The local library matrix passes
  390px/1440px, but its remaining hosted failure above stays explicit.

Build sizes: 156,329 bytes initial code/content gzip, 1,900,365 bytes core offline,
2,281,447 bytes Quiet Wing and 28,848,239 bytes upload ZIP. No budget was relaxed.
Evidence is preserved in the primary checkout under `test-results/polish-qa-2026-09-09/coordinator/`,
including `release-0.9.1/` and `live-update-0.9.1/`. Collection-settings focus is a separate
reproduced follow-up (#71); CI artifact retention for the focused browser matrices is #72.

## Remaining acceptance

Physical Android, TalkBack, sensory and difficulty acceptance remains in
[HUMAN_TODO.md](../HUMAN_TODO.md). The castle task owns the following 0.10.0 expansion.
