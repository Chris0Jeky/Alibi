# 0.11.0 — September player feedback

Published 2026-09-10 from `f1e71a042822822a7ff5e8df688945fcfa152b29` (PR #101).
Build `48a8bc3bc1ee`; both final main-based CI runs passed:
[push](https://github.com/Chris0Jeky/Alibi/actions/runs/34444705029) and
[PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34444708162).

The release adds consistent earned completion, a scene annotation cycle and hold menus,
reversible Nonogram auto-crossing, 15×15 picture puzzles, provisional Expert entries in every
family, family-first thumbnails and secondary room settings. Optional recorded CC0 rain and
waves replace the main-room synthetic bed; playback stays opt-in and caches only after use.

The unfinished invitation adds eight continuous chapters and a fifth casebook. Five new Games
Room games bring the total to eight: Tic-Tac-Toe, Block Cabinet, Draw Dominoes, Lantern Gardens
and Mahjong Solitaire join the original three. The atlas remains a separate playground.

Current totals: 355 cabinet puzzles, thirteen families, nineteen bounded source packs, five
casebooks and eight Games Room games. Published puzzle IDs and revisions remain unchanged.

## Evidence

Incremental source, independent review, uniqueness and actual-control evidence is recorded in
[STATE.md](STATE.md) and the linked PRs. All feature PRs and the final release are merged.
The 33 KiB stylesheet cap accommodates the measured 32.2 KiB
stylesheet; initial JS, game-engine, combined payload and total offline caps remain unchanged.

Local build `13fe27a36f2b` passes the full 174-test Node gate and supplementary suites. The
32-suite browser matrix passed before the final narrow Mahjong score fix; afterward, 78 Mahjong
checks, the original Club suite and 92 real-origin checks pass again. The regression reproduced
completion/reload failure before the fix and now preserves both the completed table's finite
record and another Club run through offline reload. Tests use disposable browser contexts.
Cloudflare's merged-source dry-run reads 277 assets with no runtime bindings.

Earlier candidate `c50e19f8e184` additionally passed the 176-test full gate after strengthening two
unpublished Expert entries. Dossier's key is now indirectly deduced; Bridges has five degree-valid
possibilities but one connected solution. Native and independent solvers agree; independent
review found no blocker and all twelve Expert family boards render at 390/1440px. Mahjong's
distinct matching-tile emblem passes 182 UI and 78 game checks, with both card sizes inspected.

The witness action correction produces candidate `48a8bc3bc1ee`: formatting, build, 177 Node tests
and supplementary suites pass. Statements, answer feedback and hints now describe retrieval,
delivery or arranging the gathering; existing theft records retain their default wording.
The generated app-script catalogue fingerprints were refreshed and their assertions pass.
The final main-based release gate passed. The integrated build passed full CI, 62 casebook browser assertions and visual inspection of the three
witness boards at 390/1440px. A separate actual-control proof completes all twelve new Expert
records at both widths, including wrong-witness rejection and Bridges undo (26 checks, no failures).
The proof harness and receipt are retained under `test-results/expert-control-proof/`.

Measured initial JavaScript is 127,082 bytes gzipped, combined initial code/content 176,585 bytes,
and the core offline shell 1,970,010 bytes. Recorded ambience adds 224,682 optional bytes after use.
The current primary rollback reference is Worker version `41be47e1-31e2-47d9-a7fa-7b4a4141e947`;
the fallback rollback reference is saved version 12. No rollback was executed.

## Published verification

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `feac4cbe-374a-4226-9aa2-d562e639059c`; all 274 public files match the build exactly.
  Configured CSP, no-referrer and nosniff response headers are present.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 13, deployment
  `appgdep_6aa250c558e481918654603452341b68`; all 270 non-HTML files match. Four HTML pages
  retain exact source plus the existing 938-byte hosting challenge. Provider-controlled response
  headers and MIME behavior remain the documented #6 limitation; document policy is preserved.
- Each HTTPS origin passes 92 persistence/offline checks, the scene-cycle/hold/notes and reversible
  Nonogram assistance matrix at 390/1440px, and 78 Mahjong completion/save checks.
- Disposable games on both origins pass the actual 0.10.1-to-0.11.0 Check for updates / Save & update
  transition: an extra move before activation, exact state and pinned definition survive offline
  reload. An earlier observation expired before deployment; only the completed publication run
  supplies this update evidence.

Receipts remain under `test-results/hosted-*` and
`test-results/live-update-0.11.0-20260910-publication/`. Browser file checks bypass service workers;
the initial raw Python probe was refused and is not used as file-verification evidence.

## Acceptance still open

[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android recovery, TalkBack, sound listening,
difficulty calibration and narrative/gameplay sampling. Browser emulation does not close these.
Recorded ambience avoids a streaming dependency; no third-party player or account was added.

Non-blocking review follow-ups are tracked in issues #6, #86, #89, #90, #93, #96, #100 and #102. They remain
separate from the player-reported completion and interaction fixes in this release.
