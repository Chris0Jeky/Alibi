# Cloud QA session, 1 October 2026

## Exact source baseline

`75ccfa653fe987ede90bc4e3034b867d0386aaee`, main after #499.
Linux cloud execution, Node 24.19.0. No user PC or private saves were used.

## Local verification

`npm ci` passed with a writable workspace npm cache. The first attempt failed because
this environment's default home/cache directory did not exist; no dependency change was made.

`npm run verify` exited 0: formatting, Android/web build, **853 Node tests passed**,
plus **581,847 Quiet Wing engine assertions** and **29 adapter assertions**. Adapter
fixtures do not establish real-browser persistence.

The local HTTP server started. Standalone Chromium startup failed with a process-singleton
socket `Operation not permitted`; the supported escalation attempt did not resolve it.
`browser_mobile_qa.py` ran **zero tests**, and the chained UI/origin suites did not run.
The supported cloud browser separately refused localhost with `ERR_BLOCKED_BY_CLIENT`.
These are execution-environment limitations, not evidence of an Alibi defect. No network
or security setting was weakened to work around them.

## Separate hosted browser session

Origin: `https://alibi-after-hours-preview.commit-atlas.workers.dev/`, approximately
00:47–00:50 UTC. Visible version 0.15.0, catalogue 510 puzzles. Deployment commit was
not independently established; do not treat these observations as exact-main qualification.
Telemetry was disabled with the page's own “Turn all off” control before gameplay.

Observed passing flows:

- Desk → Tidal bridges library; 32 puzzles shown.
- Search `zzzz-no-match`: zero results, explanatory empty state and Reset filters.
- Reset restores the collection; open “The four corner bearings”.
- First-play lesson opens and Start playing dismisses it.
- Select A1 then E1: a bridge appears and Undo enables.
- Undo restores A1's count to zero; Redo restores the bridge.
- Reload retains A1/E1 count 1, board progress and enabled Undo.
- Restart opens a warning explaining board/notes/history reset. Keep my place cancels
  without losing the bridge.
- Enter a synthetic personal note; navigate to collection then browser Back. The note
  remains in My notes and the board progress remains.
- Games room loads its seven visible activity cards and journal/challenge links.

A desktop screenshot of the bridge board was visually inspected. This is a small hands-on
session, not completion of every game or the repository's browser acceptance matrix.
Recent console entries were extension metadata errors; no app-wide console-clean claim.

## Existing findings and exclusions

Avoided duplicate issue creation: #501 attribution target sizing, #497 Borough Build
below phone fold, #417 landscape Block Cabinet, #502 Dominoes placement, #495 scene
clue marks, and #496 Games Room badge already have owners/threads. No newly reproduced
product defect was established in this bounded session.

Not verified: mobile/landscape layout, physical Android/TalkBack, browser suite parity,
real-origin offline/update/backup scenarios, complete game solutions, and exact deployed
build identity. These remain next-session work, not implied passes.
