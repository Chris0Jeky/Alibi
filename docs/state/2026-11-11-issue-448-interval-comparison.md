# Interval Desk claim comparison (#448)

The [owner's issue update](https://github.com/Chris0Jeky/Alibi/issues/448#issuecomment-6486064358)
records the existing standalone prototype and leaves the human explanation experiment open.
This follow-up builds on the same fictional Fenmere case at `e8a3430663c3d784f761024c7bcc0f44809c4009`.

The plain example tables show event times in minute order. The optional timeline opens below them
and places the exact same examples on a shared time axis. A circle marks a supporting schedule and
a diamond marks a counterexample. Their separate lanes keep both visible where times coincide.
The initial 447 admissible schedules still support all three verdicts across the selected claims.
With West gate before fog bell selected, one example puts the gate earlier and the other puts both
events in the same minute. A contradictory set of working windows clears both sets of markers.
The example data comes from the standalone model and the optional chart uses that same result.

## Verified

Run from the worktree root:

```powershell
node tests/interval-desk-model.test.mjs
$env:PYTHONUTF8 = '1'
$env:ALIBI_INTERVAL_DESK_EVIDENCE_DIR = 'test-results/interval-desk-claim-comparison'
py -3.13 tests/browser_interval_desk.py
```

All six model tests passed. The independent full-grid oracle agrees across 70 single-event boundary
configurations and 243 joint endpoint configurations. Chromium passed the actual controls at
320×740 and 1280×900. The new checks compare every visible marker's position to the corresponding
table minute, exercise all three verdicts and the final tick, verify clearing on contradiction,
and exercise keyboard, Undo, Restart and story controls. Both screenshots were visually inspected.
The browser fixture writes screenshot hashes and the source-bound receipt to the directory above.
It recorded zero external requests and page errors.

## Verification still open

The [playtest protocol](../../prototypes/interval-desk/README.md#human-playtest-protocol--not-yet-performed)
asks a player to explain the examples with the table first, then repeat the explanation with the
timeline. Understanding, fairness and the value of the chart still need a human playtest. Any
player-facing integration would need that finding and its own acceptance. This follow-up touches
the standalone source, its browser fixture and these notes. Hosted CI, physical devices and
assistive technology remain untested. Owner actions remain in [HUMAN_TODO.md](../../HUMAN_TODO.md).
