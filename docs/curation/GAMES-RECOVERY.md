# Games Room recovery: 25 September 2026

Refs #347. Recovered from the interrupted gameplay handoff and reconciled with
complete main source `19f45ebd880fc3f0d828688978dc028bbb789306`.

## Behavior

Lantern Duel offers Learner, Club, Keeper and Expert at bounded search depths
1, 3, 4 and 5. Existing saves without a setting retain Keeper. Changing a live
match requires confirmation; undo, saved journals, local two-player and private
rooms retain their existing owners. A different depth is not an Elo claim.

Confirmed Block Cabinet restarts obtain a seed different from the immediate
previous run, including a frozen clock/random source. Explicit seed entry is
still deterministic. Cancellation and unreadable saves do not replace the run.
Fresh session-only games remain playable and exportable. No global or
cryptographic seed-uniqueness claim is made.

Offline opponent errors now pause for an explicit Retry opponent action instead
of restarting on every render. Old workers cannot affect replacement games,
malformed replies do not crash a cleaned-up view, duplicate replies are ignored,
and rejected moves do not produce unhandled promises. Strength selection retains
keyboard focus. The shared worker behavior also covers Tic-Tac-Toe.

## Evidence and boundaries

Seventeen focused source tests pass, including six new worker/focus regressions
observed red on the recovered code. Built standalone Chromium passes ten Duel
strength/recovery scenarios and 76 Block assertions, retaining main's stationary
piece and anti-flicker checks. Fresh-seed browser expectations compare the complete
rendered board with its production replay, not a fixed tray shape or seed.

The web/Android browser-preview builds and formatting succeed. Current gameplay
JavaScript is 131,003 gzip bytes versus the unchanged strict 130,304 ceiling;
this is a known blocker, not waived. Two normal full-suite attempts exceeded the
local execution limit; no complete local suite is claimed at this checkpoint.
A separate bounded diagnostic run is not a substitute for the required CI suite.

The committed read-only workflow runs the actual-origin controls on GitHub.
Local standalone checks do not certify IndexedDB, service workers, hosted origins,
physical Android or TalkBack. Exact-head CI and independent review precede
readiness. Human gates q-1 through q-8 remain in HUMAN_TODO.md. No deployment.
