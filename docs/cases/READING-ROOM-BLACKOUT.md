# The Reading Room Blackout: experimental specimen

Refs #441, #437 and #436. Stack on #444's bounded authoring contract. This is original fiction and an authoring experiment, not a published Wrenmere chapter or official cabinet pack.

## Build and play

With Node 22, without installing packages:

```sh
node tools/case-authoring.cjs content/cases/reading-room-blackout.json
node tools/case-preview.cjs content/cases/reading-room-blackout.json reading-room-blackout.html
```

Open the new HTML in a browser. The CLI refuses to overwrite an existing file; choose a new output name for another build. The page carries its source SHA-256 and revision. It has no external scripts, fonts, assets, accounts, network requests or persistent storage. Refreshing or closing resets progress, visibly disclosed on the page. Offline source necessarily includes answer data; this is not an anti-cheat or secrecy boundary against inspection.

## The case

Six records support three stages and nine claims: narrow the removal interval, interpret a silent but disconnected alarm, and distinguish access from identification. Select supported, contradicted or not established, then a smallest sufficient source set. Incorrect input retains the draft. Rechecking cannot remove prior progress or award duplicate completion. Hints advance through orientation, constraint and method; the worked answer is a separate action and does not complete a stage.

Story mode changes presentation only. Daylight/Lamplight, native select/checkbox/button controls, source links and non-drag navigation are available. The experimental conclusion deliberately preserves uncertainty; no arbitrary culprit is revealed after the records fail to identify one.

## Boundaries and proof

`tools/case-session.cjs` consumes an already validated definition. It is a pure, memory-only transition/projection layer, not a public import validator or new save owner. Its player projection excludes authored answer bundles and worked answers. Host integration and durable recovery belong to #442.

`tests/case-blackout-model.test.cjs` independently enumerates 20 fictional worlds: five whole-minute times strictly between the two observations, two possible actors and two door-open states. The alarm remains disconnected and unheard. Each claim has a separately written predicate; uncertainty retains true and false witnesses. An empty world set is refused, and removing time/access constraints changes tested verdicts. The premise digest forces model review when source records change.

This verifies only the explicitly simplified model, not real-world clock accuracy, all possible natural-language interpretations, clue fairness, rights or enjoyment. The exact citation bundles are authored and still need editorial review; the finite model does not automatically prove each bundle's minimality. #443 owns reusable model/counterexample tooling and #453 creator repair testing.

## Reproducible verification

```sh
node --test tests/case-authoring.test.cjs tests/case-reader.test.cjs tests/case-session.test.cjs tests/case-blackout-model.test.cjs tests/case-preview.test.cjs
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_case_workbench.py
```

Local Node evidence after recorded failing contract tests: 88 tests passed across these five files. Existing castle baseline: 70 passed. Generated HTML is about 30 KiB before formatting. These numbers do not imply a full application build or human acceptance.

The local environment lacks cached build/formatter dependencies and blocks Chromium navigation to both file and loopback URLs. No local browser pass is claimed. The read-only exact-head GitHub workflow exercises 320px portrait, desktop and landscape controls, offline reload, keyboard focus, draft preservation, both story modes, staged hints, explicit reveal, restart and hostile authored text. It uploads the specimen, screenshots, source head and browser receipt, plus formatting diagnostics without modifying source. Inspect the current run rather than assuming the added test passed.

Before promotion: independent code/editorial review, current-head CI, actual-source human playtesting and a reviewed existing-host adapter. Keep the prototype outside official registration and startup byte budgets. No production save migration, deployment or external service is part of this PR.
