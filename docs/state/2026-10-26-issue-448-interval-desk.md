# Issue #448: standalone interval desk experiment

## Outcome and scope

Added the isolated, fictional Fenmere interval desk at
[`prototypes/interval-desk/`](../../prototypes/interval-desk/). The five event times are integers
between 20:00 and 20:08, with five independent inclusive witness-clock windows and four strict
precedence clues. The initial evidence admits **447 schedules**. The three authored claims are
necessary, impossible and possible under the initial model; the possible claim displays both a
supporting schedule and a counterexample.

The table is primary. It separates fixed clock evidence from the player's hypothetical working
intervals and labels all results relative to that selected model. Earlier/Later buttons and native
range inputs narrow those working windows. Undo and Restart are memory-only. The optional timeline
shows the same intervals without extra rules, and the table controls remain available. Story-off
changes only the opening scene prose. No audio or timer exists.

This remains a standalone experiment. It does not register a production activity, touch official
content or save formats, mount in the app, add a runtime package, rewrite Wrenmere Chapter IV, or
claim that timeline use improves deduction. The separate source and human-playtest protocol lives
in [`README.md`](../../prototypes/interval-desk/README.md).

## Verified

- `node tests/interval-desk-model.test.mjs`: six tests pass. A separately written oracle visits
  the full `9^5` integer grid and checks every fixed clue. It agrees with the reducer's depth-first
  enumeration for **70** possible endpoint pairs for each event's single-event working window and
  **243** joint combinations of every event at its lower endpoint, full evidence window or upper
  endpoint. Tests assert the baseline is exactly **447** and also verify all three classifications
  and retained witnesses, explicit zero-model handling, interval boundaries, undo/restart, and
  story/timeline independence.
- `python3 -m py_compile tests/browser_interval_desk.py` passes.
- Local Playwright in Chromium 141.0.7390.37 passes the actual-control fixture at **320×740** and
  **1280×900**. It exercises keyboard range adjustment with focus retention, undo, Earlier, Story
  off/on, timeline equivalence, zero schedules, restart and all three verdicts. Ten native range
  controls are visible at each width; no horizontal overflow, page errors or external requests were
  observed.
- Visual captures of the actual rendered prototype: [`320px`](../../prototypes/interval-desk/evidence/interval-desk-320.png)
  and [`1280px`](../../prototypes/interval-desk/evidence/interval-desk-1280.png). The 320px capture
  exposed and verified a correction for clipped interval endpoints.
- The browser fixture retains a [JSON receipt](../../prototypes/interval-desk/evidence/browser-receipt.json)
  binding source-file SHA-256 values, viewport/control results, Chromium version and screenshot
  hashes. Its evidence-directory override was verified to place new screenshots and receipt under
  `test-results/interval-desk/` without changing the committed reference captures.
- `.github/workflows/interval-desk.yml` adds a contents-read, path-filtered workflow that runs the
  independent oracle and actual-control fixture. The pinned browser tooling is installed from
  `requirements-dev.txt`; Chromium and system dependency installation is limited to 480 seconds
  plus a 20-second termination grace using `tools/ci-setup-phase.cjs`. CI captures all browser
  source-input hashes before and after the fixture and uploads its receipt, screenshots and hashes.
- Prettier and `git diff --check` pass.

## Not verified / remaining gates

The independent oracle checks mechanics against the authored formal clue translation; it cannot
prove that the witness prose fairly supports that translation. In particular, independent clock
windows and allowing unrelated events to share a minute are deliberate simplifying assumptions
that need to be tested with people. No human explanation/playtest has been collected, so the
timeline's reasoning value is unknown; the playtest protocol asks when to stop if it adds only
bookkeeping.

No full `npm run verify`, production build, hosted run of the new dedicated workflow, screen-reader
audit, physical-device acceptance or production integration was run. No `HUMAN_TODO.md` decision
or Wrenmere Chapter IV acceptance gate changed; the owner's existing human and device checks remain
open.
