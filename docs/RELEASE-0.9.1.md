# Alibi 0.9.1 · Keep your place

Candidate, 2026-09-09. Exact-head CI, review and publication remain pending.

The iterative QA pass reproduced puzzle-panel overflow at 320px with large text: a 296px
content area was forced to 314.84px. Grid children can now shrink to their available space.
The regression covers normal/large text, contrast, small and full Sudoku boards, crime scenes
and aquariums across 320px, 390px, short landscape and desktop layouts.

The same visual pass found 8px mobile Desk assistant labels and 28–32px targets despite the
large-text setting. Those controls now use relative type (at least 14px in the tested settings),
44px targets and wrapping. Actual candidate selection and help-dialog controls pass alongside
the layout assertions; neither assistance rules nor player notes change.

Library filters and pagination preserve keyboard focus after re-rendering. The actual-control
regression checks filtering, further pages and the final page, alongside search and history.

The player-facing history includes this patch and all earlier entries. No puzzle definition,
revision, storage identity or content count changes. Generator preservation and the test-only
asset timeout fixture are maintenance work, separate from player state.

The current public release remains 0.9.0 until the publication receipt is recorded. Disposable
0.9.0 saved games are held on both sites for an actual update and offline-reload check.
Physical Android, TalkBack, sensory and difficulty acceptance remains in
[HUMAN_TODO.md](../HUMAN_TODO.md). The castle task owns the following 0.10.0 expansion.
