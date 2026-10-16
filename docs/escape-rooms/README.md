# Escape-room rehearsal foundation

Refs #460, #461, #464 and #465; research/specification in PR #478. This dependency-free authoring tool is not a production import format or a new save owner.

Run `node tools/escape-authoring.cjs room.json` to validate and analyze a `postern-escape-1` source. The receipt binds exact UTF-8 bytes to SHA-256. Exit 0 means the declared finite model is recoverable from all reachable states, 1 invalid source/options, 2 an unsafe model, 3 inconclusive analysis. Unknown fields and future versions are refused. Inspect the tests and source for the exact contract.

A room declares paired story text, up to eight finite variables, sixteen objects and forty-eight actions. The Cartesian state space cannot exceed 4096. Availability is distinct from success conditions, so a wrong mechanism setup need not hide the attempt button. One location variable represents one physical item. Effects are deterministic assignments, not authored code. Wrong input changes nothing. Completion is terminal. Sources are bounded at 262144 UTF-8 bytes; text fields at 1800 UTF-16 units, labels 120 and input answers 64.

`escape-state.cjs` supplies strict validation, initial state, immutable transitions and a player projection that does not read accepted answers, success predicates, effects or worked solutions. Consumers validate definitions at their boundary. The raw offline source is inspectable and is not an anti-cheat mechanism.

`escape-authoring.cjs` explores successful actions then reverse-searches from all goals. It reports a shortest solution, a shortest softlock witness and unreachable actions. Exploration caps yield inconclusive, never a clean truncated result. This proves only recovery in the declared finite model, not clue sufficiency, natural-language fairness, accessibility or enjoyment.

## Evidence and continuation

Recovered from the previous delivery attachment and rerun: 52 focused Node tests passed on 27 September 2026, with no failures/skips on Linux. Command: `node --test tests/escape-state.test.cjs tests/escape-authoring.test.cjs`. The named-pipe test is skipped on Windows. The local full-source archive matches old main a3c6ad9; this publication adds only new files to inspected live main ba8c888. No old runtime file is replaced. Full exact-head CI and formatting remain required; local offline npm installation lacks youch-core 0.3.3.

The read-only workflow records its actual source and formatter diagnostics without modifying or pushing code. #466 owns playable room sources/UI; #467/#442 the real host/save adapter; #433 optional delivery. No new escape room has been deployed by this foundation. Independent review, head aging, physical-device and human calibration remain distinct gates.
