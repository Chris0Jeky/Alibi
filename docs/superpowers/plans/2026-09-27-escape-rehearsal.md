# Escape-room rehearsal implementation plan

> For agentic workers: use superpowers:executing-plans task by task. No independent subagent capability is exposed here.

**Goal:** validate and rehearse stateful rooms, detect softlocks, then exercise two original specimens.

**Architecture:** build-time bounded authoring checks plus a pure finite-state transition module. A later offline preview consumes the same transitions, never production storage.

**Tech stack:** Node 22 CommonJS, native DOM, existing Python Playwright; no added dependency.

**Spec:** ../specs/2026-09-27-escape-rehearsal.md

## Global constraints

262144 UTF-8 bytes; 8 variables; 2..6 values each; Cartesian product <=4096; 16 objects; 48 actions; 8 observations/object; prose 1800/title120/answer64 UTF-16 units. Preserve all published data, saves, routes and numerical delivery ceilings. Unknown versions fail. Default graph limits 4096 states/196608 edges. Hints and projected actions never inspect answer, check, set or solution. Prototype is not production acceptance.

## Review focus

Hidden actions must not work through direct calls. A win path must not conceal a different path into an unrecoverable state. Caps must produce inconclusive rather than a green receipt. Invalid input and repeated completion must preserve state. Wrong setup must not disappear from the UI and reveal the solution.

## Task 1: contract and transitions (#464)

Files: tools/escape-state.cjs; tests/escape-state.test.cjs.
Interfaces: validate(d) -> counts; initial(d) -> state; transition(d,state,id,input) -> {ok,code,state}; project(d,state,storyOn) -> visible object/action view.

- [x] Write fixtures and failing export/validation/transition/projection tests; capture RED.
- [x] Implement exact schema, bounds, references, state checking, availability versus success checks and immutable transitions.
- [x] Test negative inputs, story parity and getter traps on answer-bearing fields; run Node tests and existing Castle object tests.
- [ ] Commit the tested source in an isolated worktree.

## Task 2: exhaustive recovery diagnostics (#465)

Files: tools/escape-authoring.cjs; tests/escape-authoring.test.cjs.
Interfaces: parse(text) -> definition/receipt; read(path) -> parsed; analyze(d,{maxStates,maxEdges}) -> finite-model report with status, counts, solution and softlock witness.

- [x] Write failing solvable-but-softlocked, reversible-cycle, hidden-action and cap fixtures.
- [x] Implement bounded reads, BFS graph, reverse winning reachability and source receipts.
- [x] Verify independent tiny-graph expectations and replay reported paths; test malformed UTF-8, oversized source and FIFO refusal.
- [ ] Publish a focused foundation PR with spec/plan, no host or content changes.

## Task 3: original room pair and preview (#466)

Files: content/escape-rooms/{tidekeeper-workshop,printmaker-cabinet}.json; tools/escape-preview.cjs; tools/escape-ui/{view.js,style.css}; tests/escape-content.test.cjs; tests/escape-preview.test.cjs; tests/browser_escape_rooms.py; docs/escape-rooms/ROOM-PAIR.md.

- [ ] Author exact clue packets and independent answer derivations; test all-state recovery and every trace through real transitions.
- [ ] Write failing preview/hash-CSP/hostile-text/output-preservation tests before implementing builder/UI.
- [ ] Exercise both rooms through actual controls, wrong inputs, help/reveal, undo/restart, story switches and offline reload at 320/1280px.
- [ ] Publish separately, stacked on foundation. Preserve source-head receipt and screenshots in a read-only CI lane.

## Execution ledger

Archive tree exactly matches upstream main. Local snapshot commit is a local reconstruction, not upstream SHA. Existing Castle object suite: 6 passed. Fresh offline npm install fails because youch-core@0.3.3 is not cached; full build is not claimed. No production dependencies changed. Treat new proof counts as finite-model facts only. Self-review is not independent review.

Foundation source/authoring suite: 52 passed after RED tests, including a review regression for explicit null/undefined caps. Defaulting is allowed only for omitted options. Code uploads were blocked before GitHub execution, so the foundation PR task remains incomplete. The source and tests are preserved as a local reviewable delivery. Task 3 is not implemented: twelve treatment briefs and checked example deductions do not constitute two playable room files. Full formatting/build/browser and independent review remain open.
