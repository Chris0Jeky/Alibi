# Alibi 0.10.1 · Smooth keyboard browsing

Candidate, 2026-09-09. Combined local verification passes; CI and publication remain pending.

Library puzzle buttons retain keyboard focus through background refreshes. Collection settings
retain the selected button, while the removed Show all collections escape focuses the updated
results status. The patch preserves the first-new-puzzle behavior when loading further pages.

The 0.9.1 hosted library matrix exposed a timing-dependent failure. A controlled synthetic
storage event with service workers blocked reproduces focus loss to BODY on build `efb6b034ac62`.
The focused patch retains the same card in view and Enter opens its exact puzzle. This proves
the rendering defect; the original hosted service-worker sequence remains unproven (#75).
Actual keyboard controls cover filtering, search, empty results, all pagination pages, background
refreshes and collection escape at 390px/1440px. The combined castle base and 0.10.1 metadata pass
source verification (148 Node tests), 182 UI checks, 53 library keyboard checks, 20 discovery/history
checks and the narrow-layout matrix. Phone and desktop focus screenshots, history and 320px large-text
player layout were visually inspected. Hosted evidence follows here.

Authoring maintenance (#69) preserves published array order and the complete catalogue header,
appending only absent seeded IDs. Disposable regressions cover middle insertion, reordered
puzzles/books, edited metadata and duplicate rejection. Normal builds do not run the generator;
no published catalogue content, puzzle revision, database version or save identity changes.

Independent source reviews found no direct correctness defect in either focus slice or generator
preservation. The castle-base integration retains the same focus logic and refreshes only its
derived source hashes. Final publication receipts will be recorded before closeout.
Physical Android, TalkBack, human difficulty/comfort and castle new-player acceptance remain
in [HUMAN_TODO.md](../HUMAN_TODO.md). This patch does not certify a physical phone.
