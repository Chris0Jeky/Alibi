# Timeline Desk lab (issue #448 spike)

Base: `main` at `a21dc725`. Branch `claude/timeline-desk-lab`. Not pushed, not a pull request, not a production release.

Question (#448): can an interval-style interface give satisfying deduction without forcing an unjustified exact timestamp? This slice answers it as a standalone, experimental, original game. It is not registered in the official catalogue and does not touch Wrenmere Chapter IV (#77), Eclipse Lab or the castle.

## Delivered

- **Game.** Reconstruct a night: 4 to 6 events, 5 to 8 hourly slots, each event in exactly one slot; a level says whether two events may share an hour. Clues are structured and rendered as plain language: before, after, exactly or at least k hours apart, between two hours, not at an hour, and an uncertain witness clock (reading plus or minus one hour). The player is an events by hours grid of native buttons. A tap cycles open, ruled out (X), placed (dot); placing moves the event within its row. Symbols differ in shape and the accessible name carries the state (`Ada leaves the study at 10pm: ruled out`). Targets are at least 44 px, arrows move, X/P/Backspace mark, no timers, Undo/Redo/Restart (restart is undoable). Winning shows a one-line story payoff.
- **Twelve levels** `timeline-01..12`, revision 1, in `src/timeline-lab/puzzles.mjs`. Levels 1 to 3 teach ordering, distances and the witness clock; 4 adds ranges and not-at; later levels mix them and alternate shared-hour rules. Early levels fall to direct elimination; levels 7 to 12 need a what-if (`propagate` in the authoring script; a proxy, not a human rating).
- **Solver and hint.** Depth-first enumeration of at most 8^6 assignments serves tests, hints and the win check. A hint never reads `solution`. It prefers a cell one clue (or the shared-hour rule) explains and names the clue, falls back to full enumeration of the schedules consistent with the marks, and reports a contradiction, outlining the marks whose individual removal restores a schedule. Because every level has a unique schedule, enumeration alone would reveal the answer at once; the single-clue preference is what keeps hints incremental.
- **Lazy pack.** `src/timeline-lab/{entry,model,puzzles,player,storage,feedback}.mjs` plus `style.css`, built by `tools/build-timeline.cjs` into one hashed asset, loaded through `AlibiActivities` at `#/quiet/timeline` (`AlibiTimeline`), cached on first visit, flushed by the shared update guard. Sidebar entry "Timeline Desk, Experimental".
- **Saves.** Separate localStorage keys `alibi.timeline.v1` and `alibi.timeline.recovery.v1`, per `id@revision` pinned definition, bounded (64 runs, 40 history steps), Web Lock guarded, unknown or future bytes preserved and exported, backup/restore with recovery copy. `alibi-device` and every existing store are unchanged. Optional local rating, difficulty and note with the same explicit GitHub/Voices share path as Eclipse Lab (no marks or history).
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
