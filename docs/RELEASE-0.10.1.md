# Alibi 0.10.1 · Smooth keyboard browsing

Published 2026-09-09 from `900816a33c1795ef06e196e36803ab86544ece15` (PR #81).
Build `3161ffd2958c`; 328 puzzles, thirteen families, four casebooks.

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
player layout were visually inspected. The complete hosted library matrix now passes on both
origins, including the controlled background-refresh regression and collection escape.

Authoring maintenance (#69) preserves published array order and the complete catalogue header,
appending only absent seeded IDs. Disposable regressions cover middle insertion, reordered
puzzles/books, edited metadata and duplicate rejection. Normal builds do not run the generator;
no published catalogue content, puzzle revision, database version or save identity changes.

Independent source reviews found no direct correctness defect in either focus slice or generator
preservation. The castle-base integration retains the same focus logic and refreshes only its
derived source hashes. The castle publication receipt and a test-only core-offline readiness wait
are preserved from the separate Wrenmere task; the corrected exploration suite passes locally.

## Publication and verification

All four final CI checks passed at `97f02b55a197a928d87ff9878c8b6f1cf01e19a3`:
[full push](https://github.com/Chris0Jeky/Alibi/actions/runs/34411189544),
[full PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34411193426),
[castle push](https://github.com/Chris0Jeky/Alibi/actions/runs/34411189552), and
[castle PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34411193467).
The merged source rebuild retains the same verified build identifier.

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `41be47e1-31e2-47d9-a7fa-7b4a4141e947`; all 271 public files match exactly.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 12,
  deployment `appgdep_6aa1de3c793881919ea3015288a40f58`; all 267 non-HTML files match.
  Four HTML pages retain exact source plus the known 938-byte hosting challenge script.
- Each actual HTTPS origin passes 92 storage/offline checks and 53 library keyboard checks.
  The primary also passes 20 discovery/history checks and the narrow-layout/assistant matrix.
  The corrected castle exploration/media/offline suite passes all nine checks on each host.
- Disposable saves on both origins pass the actual 0.10.0-to-0.10.1 Check for updates / Save &
  update transition. An extra move before activation, exact state and pinned definition survive
  activation and offline reload. These receipts are separate from local simulated updates.

Build sizes: 160,868 bytes initial code/content gzip, 1,942,187 bytes core offline,
2,281,447 bytes Quiet Wing, 1,278,591 bytes castle and 29,976,963 bytes upload ZIP.
No budget was relaxed. Evidence is preserved under the primary checkout's
`test-results/polish-qa-2026-09-09/focus-followup/`, including the final release and live-update receipts.

## Remaining acceptance

Physical Android, TalkBack, human difficulty/comfort and castle new-player acceptance remain
in [HUMAN_TODO.md](../HUMAN_TODO.md). This patch does not certify a physical phone.
The castle's separate P2 follow-ups (#79/#80) and provider-controlled fallback headers/MIME (#6)
remain tracked. The original 0.9.1 hosted event sequence remains unproven; the corrected behavior
has direct local and hosted regression evidence.
