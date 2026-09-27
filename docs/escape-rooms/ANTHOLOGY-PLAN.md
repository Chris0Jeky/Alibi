# Six-room playable anthology, 27 September 2026

Owner-approved continuation of #460/#466. Foundation is now published in PR #480, not merged. Work on its separate dependent branch.

## Scope and design

Build Tidekeeper, Printmaker, Moonseed, Herbarium, Counterweight and Clockmaker as complete original rehearsal sources, a reusable browser player and a bounded authoring build. Six different mechanisms, not six randomized passwords. Preserve the contract in #478 and all live app identities, storage and budgets. These are optional standalone rehearsal files, not canonical/deployed Wrenmere chapters. No external dependencies/assets or runtime storage. A room switch preserves memory state; refresh clears it, visibly disclosed.

Native controls and an object directory are the primary playable view. Every physical state change has prose feedback. Show only available objects. Distinguish action availability from mechanism success. Provide per-action three-stage hints, separate worked solution, scratch notes, 64-step undo, restart confirmation and Daylight/Lamplight. Stale detached controls must not mutate a later room or newer render. Never render authored markup as HTML.

A builder accepts 1..12 explicit room paths, validates their size/schema, requires complete finite-model recovery evidence, rejects duplicate IDs, and emits one exclusive-created HTML and per-source receipts. No output overwrite; no production installation. It compiles fixed local scripts/styles with hash-only CSP. Does not serve as an import or save format.

## Tasks / test cycle

- [x] Session: write RED tests; implement createRoomSession(d) with view/attempt/undo/restart and bounded history; verify no-op attempts, terminal state, independent rooms, input snapshots and answer-free view.
- [x] Content: write RED existence/semantic tests; author six static JSON sources; independently derive all coded answers and configuration predicates, enumerate every reachable state, replay alternate branch orders and unique item movements. Bind reviewed source hashes.
- [ ] Player: RED builder/CSP/escaping/duplicate/output tests; implement offline anthology, object/control/notes/help UI; actual-control tests for all six rooms at phone/desktop plus landscape, both story modes, stale events, restart/cancel, undo and hostile strings.
- [ ] Publish one coherent six-room/player comparison PR on #480. Attach current-head receipts, screenshots and explicit unverified gates. No merge without independent review and full exact-head CI.

## Rulings and constraints

No subagent capability is available, so work is inline and self-review is not independent. Local archive tree is old main a3c6ad9; live publication base ba8c888 preserves newer restore/testing work. Dependency cache is incomplete. Focused sources are independent; full build/browser-origin evidence must come from a clean exact-source environment. Do not manufacture receipts. Proposed difficulty is uncalibrated.

Items are represented once, as a location or an explicit grouped bracket configuration. Each clue states the fictional mechanism rules; no external physics/printmaking knowledge is required. Clock turns are an authored input abstraction, not an inaccurate animated simulation of sixty individually modeled ticks. Authored source and separate derivation oracle are checked independently.

## Execution ledger

The foundation is published in #480. Its first dedicated CI passed the 52 tests and failed formatting only; exact-source formatter output was digest-checked and applied. The six-room increment passes 93 Node tests locally, including source-bound clue review, independent transition enumeration, alternate paths and bounded sessions. Eighteen DOM-loaded Chromium control scenarios passed; normal local file navigation is blocked by managed policy, so it remains a separate CI gate. No policy was bypassed and no origin acceptance is inferred from DOM controls.

Ruling: publish the six-room player and content as one coherent comparison increment, rather than temporarily breaking tests between a two-room and four-room split. Foundation remains independently reviewable in #480; each content source remains a separate file. Source hashes in anthology-review.json require an explicit clue/model review when text or rules change. The review is by the executing author, not an independent reviewer.
