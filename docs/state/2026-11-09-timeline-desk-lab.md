# Timeline Desk lab (issue #448 spike)

Original base: `main` at `a21dc725`. The work is under PR #929; it is experimental and is not a production release.

Question (#448): can an interval-style interface give satisfying deduction without forcing an unjustified exact timestamp? This slice answers it as a standalone, experimental, original game. It is not registered in the official catalogue and does not touch Wrenmere Chapter IV (#77), Eclipse Lab or the castle.

## Delivered

- **Game.** Reconstruct a night: 4 to 6 events, 5 to 8 hourly slots, each event in exactly one slot; a level says whether two events may share an hour. Clues are structured and rendered as plain language: before, after, exactly or at least k hours apart, between two hours, not at an hour, and an uncertain witness clock (reading plus or minus one hour). The player is an events by hours grid of native buttons. A tap cycles open, ruled out (X), placed (dot); placing moves the event within its row. Symbols differ in shape and the accessible name carries the state (`Ada leaves the study at 10pm: ruled out`). Targets are at least 44 px, arrows move, X/P/Backspace mark, no timers, Undo/Redo/Restart (restart is undoable). Winning shows a one-line story payoff.
- **Twelve levels** `timeline-01..12`, revision 1, in `src/timeline-lab/puzzles.mjs`. Levels 1 to 3 teach ordering, distances and the witness clock; 4 adds ranges and not-at; later levels mix them and alternate shared-hour rules. Early levels fall to direct elimination; levels 7 to 12 need a what-if (`propagate` in the authoring script; a proxy, not a human rating).
- **Solver and hint.** Depth-first enumeration of at most 8^6 assignments serves tests, hints and the win check. A hint never reads `solution`. It prefers a cell one clue (or the shared-hour rule) explains and names the clue, falls back to full enumeration of the schedules consistent with the marks, and reports a contradiction, outlining the marks whose individual removal restores a schedule. Because every level has a unique schedule, enumeration alone would reveal the answer at once; the single-clue preference is what keeps hints incremental.
- **Lazy pack.** `src/timeline-lab/{entry,model,puzzles,player,storage,feedback}.mjs` plus `style.css`, built by `tools/build-timeline.cjs` into one hashed asset, loaded through `AlibiActivities` at `#/quiet/timeline` (`AlibiTimeline`), cached on first visit, flushed by the shared update guard. Sidebar entry "Timeline Desk, Experimental".
- **Saves.** Timeline uses `alibi.timeline.v1` and retains the legacy `alibi.timeline.recovery.v1` key. A restore commits the active shelf and its pre-restore recovery snapshot in one record. Runs pin definitions by `id@revision`; the store is bounded (64 runs, 40 history steps), Web Lock guarded, and preserves unknown or future bytes for export. `alibi-device` and every existing store are unchanged. Optional local rating, difficulty and note use the same explicit GitHub/Voices share path as Eclipse Lab (no marks or history).
- **Authoring.** `tools/curation/timeline-candidates.mjs` with `timeline-specs.mjs` derives a minimal clue set per hand-written story and schedule; a test regenerates all twelve and compares.

## Budgets

| Measure | Before | After | Ceiling |
| --- | --- | --- | --- |
| Startup JS gzip (`javascriptGzipBytes`) | 135,509 | 135,584 (+75) | 135,680 (unchanged) |
| Initial code and content gzip | 206,943 | 207,017 | 225,280 (unchanged) |
| Timeline pack raw / gzip | n/a | 45,354 / 16,083 | 48 KiB own ceiling |
| Eclipse pack | 52,319 | 52,319 | unchanged |

Startup glue is a four-entry kind map, one regex word, one flush line and one sidebar item. Accounting tests and the Android rules digest sources now include the new pack and its model/storage. No existing ceiling was raised.

## Findings on the #448 question

Structured uncertainty works as ordinary deduction here: a witness clock is a three-hour window, never an exact stamp, and the level still resolves to one schedule. Hints show the failure mode of any unique puzzle: global enumeration is the answer, so only locally explainable steps teach. Not measured: whether players can explain supported, possible and excluded timelines, or whether an optional visual timeline adds inference beyond this table. Counterexample retention and necessary/possible/impossible classes are not built; the hint reports forced cells and contradictions only. Those need a human playtest and a follow-up slice.

## Verification

See the hand-off for command results. Independent checks: `tests/timeline-model.test.mjs` uses a separate T^N brute force and an exhaustive predicate-boundary comparison; every clue is shown necessary; hints are checked against enumeration, a poisoned `solution`, loosened puzzles and hint-only play-throughs of all 12 levels. `tests/browser_timeline_lab.py` plays levels 1, 2 and 10 with real clicks and keys at 390 and 1280 px and checks target sizes, overflow, feedback, backup, protected saves and an offline reload.

## Not verified

No human playtest or difficulty calibration; no physical phone, screen reader or TalkBack run; no 320 px check (grid scrolls inside its container below about 360 px for 8-hour levels); no hosted or production check; the Android build was run but no device. Payoff sentences are authored claims about each unique schedule and are not machine-checked.

## 9 November integration

PR #929 was reconciled with main d9300ffc after #927. The only textual conflict was the catalogue's src/app.js metadata; it was regenerated from the combined source. The combined web build reported startup JavaScript 135,589 / 135,680 gzip bytes. Exact-head CI, Android and browser qualification remain required; this build is not a release receipt.

## 11 November restore review

Two independently reproduced data-loss defects were fixed in `896f5a3a`: a pending restore could erase a new feedback draft or allow an old-board edit to overwrite the restored run, and a failed active-save write could replace the prior recovery copy. Restore now fences stale writes and commits the active shelf with its recovery snapshot atomically. On that commit, `npm run verify` passed 2,676 Node tests with 21 skips, and 42 focused Timeline tests passed. Independent UI and storage reviews found no remaining blocker; browser verification of the final head remains required. The stale clue-selection issue is tracked in #941 and main-thread backup validation in #931. Older builds preserve the new active record as unknown rather than opening it; no physical-device or hosted proof is claimed.
