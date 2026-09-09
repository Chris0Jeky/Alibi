# Player discovery and iterative QA

Active objective: work through seeded issues, continue actual-control QA, publish a player-facing changelog including historical versions, improve GitHub release notes retroactively, and make new collections/features inviting and readable.

## Working strategy

1. Reconcile current issues, deployed builds and release history. Preserve owner inputs and published puzzle/save identities.
2. Redesign collection discovery and recent additions together: illustrative cards, concise invitations, explicit actions, persistent filter escape. Keep the family-first library.
3. Add offline version history on the desk and in the footer. Backfill historical GitHub descriptions from source receipts, retaining technical evidence and download assets.
4. Fix independent seeded defects in small commits: Quiet Wing/native-link focus (#62), anthology framing (#61), Bridges arrows (#9), inherited crop identifiers (#15), and investigate supported development-tool updates (#58).
5. Reproduce and capture the fallback update lifecycle (#63) across the next real release with a disposable saved game and worker/network diagnostics.
6. Continue phone/desktop actual-control QA, visual inspection, save/offline checks, independent review, CI, reviewed merge and complete deployment. Classify the remaining issue inventory by actual prerequisites; do not treat the separate Wrenmere stack or human acceptance as completed.

## Current assignments

- Coordinator: release publication, live-update proof, ongoing QA and integration.
- Completed: Terra focus/motion, Luna Bridges/garden and anthology fixes; integrated in PR #65.
- Luna xhigh: generator/authoring repair (#66) in an isolated checkout and independent next interaction audit.
- Separate task **Explore Alibi castle expansion** owns castle production, museum, notebook and recovery work.

## Acceptance matrix

- Desk: discover each collection, open Sun & Moon, open version history, return to a saved puzzle.
- Library: thirteen families, all four collection filters, show all, search/reset, empty results, pagination and return paths.
- Version history: earlier deployed versions present, accurate highlights, keyboard access, small/large text, direct URL and offline reload.
- Casebooks: connected Bellweather prose versus independent anthology records; no unsolved endings exposed; replay and out-of-order progress retained.
- Accessibility: root/Quiet Wing entry and exit via actual buttons/links; direct loads and browser history preserve their own focus; first-play modal focus; no horizontal overflow at phone widths.
- Persistence: saves and pinned definitions unchanged, current-origin offline suite and a live update with an extra move before activation.

Evidence will be recorded as each check runs. Physical Android, TalkBack, human difficulty/sensory review and owner decisions remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## First integration checkpoint

The news/history slice passed source verification, 182 UI checks, 66 curation checks, 20 focused
discovery/history checks and 92 local real-origin checks. Visual inspections covered phone and
desktop cards, large text/high contrast, and the night palette. All eight historical GitHub
release entries are visible; twelve API assertions verify source tags and original receipt/assets.
The source-only 0.2 baseline is also retained in the app and repository changelog.

Integrated from independent worktrees: #9 Bridges directional movement (261 expedition checks),
#15 inherited crop names and non-mutating restore refusal, #62 root/Quiet Wing native-link focus,
#36 preserved local motion under root/OS overrides, and #61 anthology framing. Final combined
checks and review remain in progress. #58 uses a scoped Sharp patch override with unchanged other
package versions; clean installation and audit report zero vulnerabilities.

The first live-update seed attempts failed before an update existed: one test predicate violated
CSP and the corrected persistent-profile attempt had no registered worker. A separate fresh
Chromium context reached offline-ready on primary0.8.2 with complete activation events and no
errors; ordinary scripted HTTP403/1010 responses were client-specific, not evidence that normal
browser access was broken. A fresh context probe captures worker events and diagnostics and uses
the actual Check for updates and Save & update controls. Keep all outcomes separate.

## Published checkpoint and next work

0.9.0 is live on both origins from merged PR #65 (`92565a4`), build `f0b367c654a4`.
Both full CI runs and independent review passed. Both current origins pass 92 storage/offline
checks; primary discovery/history passes 20 actual-control checks at 390px/1440px. Both actual
0.8.2-to-0.9.0 update transitions preserve the extra saved move and pinned definition through
offline reload (#63). See [RELEASE-0.9.0.md](RELEASE-0.9.0.md).

Continue #66 and the independent interaction audit. Castle-related issues #43–56 and their
original PR stack belong to the active castle task; coordinate main/deployment changes instead
of parallel implementation. Companion/garden/realm expansion #29–35/#37 retains its prerequisite
design and acceptance gates. Physical/human checks (#1, #2, #11, #13, #56) remain open; the two
positive real-player reports do not stand in for those specific checks. Provider headers (#6)
and shared estate registration (#3) remain outside this app-code slice.
