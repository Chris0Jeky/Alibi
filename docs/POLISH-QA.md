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

- Coordinator: discovery UI, version history, anthology copy integration, release publication and final QA.
- Terra high: focus transitions and adjacent motion-preference diagnosis in its own checkout.
- Luna xhigh: bounded Bridges/garden regressions in its own checkout.
- Luna xhigh: read-only historical release and narrative evidence.

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
