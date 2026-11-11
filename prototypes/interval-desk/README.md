# Interval desk prototype

This is a standalone experiment for issue #448. Open `index.html` through a local static web
server; no application build, package installation or production registration is involved. For
example, from the repository root:

```sh
python3 -m http.server 8798 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8798/prototypes/interval-desk/`. The page uses only its local HTML,
CSS and JavaScript files. It has no audio, timer, storage, external requests, runtime solver package
or import into the shipped application.

## Fictional source and formal scope

Fenmere signal house has five recorded events: a lantern goes dark, a fog bell sounds, a west gate
opens, a ledger is signed, and an oil case reaches the quay. Five witness clocks may each be a
minute off. The surviving entries are inclusive, corrected whole-minute windows after 20:00:

| Event                     | Fixed window |
| ------------------------- | ------------ |
| Lantern goes dark         | 20:01–20:05  |
| Fog bell sounds           | 20:03–20:07  |
| West gate opens           | 20:02–20:06  |
| Ledger is signed          | 20:04–20:08  |
| Oil case reaches the quay | 20:05–20:08  |

The fictional witness notes support four strict ordering statements: lantern before bell, gate
before ledger, bell before case, and ledger before case. Every event time is an integer minute.
The corrected windows are independent because the calibration log is missing; the prototype does
not infer one shared offset across clocks. Events not ordered by a clue may share a minute. This is
an explicit simplification, not a claim about real clock records.

`model.mjs` contains the source windows and clue translations. Its depth-first enumerator prunes a
partial schedule when an already-bound strict ordering fails. The complete corrected-window search
space is bounded at 2,500 tuples. At the initial windows it finds **447** admissible schedules.
The claims illustrate the three logical outcomes:

- Lantern before case is **necessary** in the current model because the two intervening clue links
  force that order.
- Case before bell is **impossible** under the fixed clues.
- Gate before bell is **possible but not necessary**; the desk retains both a supporting schedule
  and a counterexample. The selected ranges remain hypotheses, so the label is never presented as
  an unconditional fact.

The example tables list events in minute order. Open the optional timeline below them to see the
same working windows as bands and the same example times as circles and diamonds. A circle marks
a supporting schedule and a diamond marks a counterexample. The marks occupy separate lanes even
when the examples agree on a time. The timeline is read-only. Story-off hides the opening scene
paragraph. Undo applies to interval edits, and Restart restores the original windows and default
presentation.

## Automated verification

Run the pure model tests directly:

```sh
node tests/interval-desk-model.test.mjs
```

The test-only oracle enumerates the complete `9^5` minute grid and checks all four clues without
using the reducer's recursive pruning. It compares the resulting ordered schedule list against the
reducer for all **70** possible `[earliest, latest]` windows for each event, holding the other
working intervals at their fixed evidence windows. It also checks all **243** joint combinations
where each event is at its lower endpoint, full fixed window or upper endpoint. Separate assertions
validate the three claim classifications and both directions of the possible claim, an explicit
zero-schedule result, undo/restart, and story/timeline independence.

Run the actual-control browser fixture with Python Playwright and Chromium available:

```sh
python3 tests/browser_interval_desk.py
```

Set `ALIBI_CHROMIUM` when Playwright should use a specific local Chromium executable. The fixture
starts a temporary loopback-only static server. Set `ALIBI_INTERVAL_DESK_EVIDENCE_DIR` to write
browser evidence to another repository-local directory; the default refreshes the committed
reference evidence. It checks 320×740 and 1280×900 layouts, keyboard
range edits and focus retention, Undo, Earlier, Story off/on, Restart and all three verdicts. It
checks marker positions against the minute-order tables after changing the claim or narrowing a
range, and verifies that both sets of markers clear in the zero-schedule state. It also checks
for external requests and page errors. The original reference screenshots are
[`320px`](evidence/interval-desk-320.png) and
[`1280px`](evidence/interval-desk-1280.png). A source-hash-bound JSON receipt with the browser
version, viewport results and screenshot hashes is written to
[`browser-receipt.json`](evidence/browser-receipt.json).

The dedicated `Interval desk prototype` workflow runs the full-grid oracle and this browser
fixture on relevant changes. It bounds Chromium and system-package installation to eight minutes
plus a twenty-second termination grace, and uploads fresh screenshots, the browser receipt and
before/after source hashes as a CI artifact. It writes those results under `test-results/` so the
committed local reference evidence remains untouched by CI.

## Human playtest protocol — not yet performed

Automated model agreement is mechanics evidence, not evidence that someone understands intervals,
finds the clues fair, or wants the timeline. For a later playtest, use a fresh browser tab and ask
the player to think aloud without timing the solve:

1. Ask what the fixed clock windows mean and whether 20:03 asserts an exact event time. Ask which
   events could share a minute if no clue orders them.
2. With the timeline hidden, have them choose West gate before fog bell. Ask how the two examples
   differ and whether either is proof that the event order is historical fact. In the counterexample,
   the gate and bell share a minute, which is enough to refute strict “before.” Record the player's
   first explanation before giving that interpretation.
3. Have them explain why Lantern before Case is necessary and why Case before Bell is impossible,
   using the displayed support or counterexample schedules.
4. Narrow Lantern to 20:05 and Bell to 20:03–20:04. Ask what “no schedules fit” means; it must not
   be mistaken for proof of any selected claim. Restart and use Story off, then confirm the same
   event names and clues remain.
5. Restart and return to West gate before fog bell. Open the optional timeline and ask the player to
   explain what the circles and diamonds show about the gate and bell. Compare this explanation
   with the table-only one. Record whether the timeline clarified strict order, added a useful way
   to inspect the same evidence, or added bookkeeping. Stop investing in it if it adds bookkeeping.

Record the player's explanation, where they treat a window as an exact time, how they use the
counterexample, and whether the timeline changes their reasoning. Do not infer understanding or
enjoyment from completion time, a green test or an automated schedule count. No human playtest,
device acceptance, screen-reader audit, chapter rewrite, or production integration is claimed here.
