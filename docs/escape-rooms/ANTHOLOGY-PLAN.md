# Six-room playable anthology, planned 27 September 2026

Owner-approved continuation of #460/#466. Reconciled 9 November 2026: the foundation shipped in merged PR #480, and the six-room player and sources shipped in merged PR #481. This document preserves the original plan and execution ledger; current evidence and remaining limits are recorded in [ANTHOLOGY.md](ANTHOLOGY.md) and [the dated status reconciliation](../state/2026-11-09-escape-status-reconciliation.md).

## Scope and design

Build Tidekeeper, Printmaker, Moonseed, Herbarium, Counterweight and Clockmaker as complete original rehearsal sources, a reusable browser player and a bounded authoring build. Six different mechanisms, not six randomized passwords. Preserve the contract in #478 and all live app identities, storage and budgets. These are optional standalone rehearsal files, not canonical/deployed Wrenmere chapters. No external dependencies/assets or runtime storage. A room switch preserves memory state; refresh clears it, visibly disclosed.

Native controls and an object directory are the primary playable view. Every physical state change has prose feedback. Show only available objects. Distinguish action availability from mechanism success. Provide per-action three-stage hints, separate worked solution, scratch notes, 64-step undo, restart confirmation and Daylight/Lamplight. Stale detached controls must not mutate a later room or newer render. Never render authored markup as HTML.

A builder accepts 1..12 explicit room paths, validates their size/schema, requires complete finite-model recovery evidence, rejects duplicate IDs, and emits one exclusive-created HTML and per-source receipts. No output overwrite; no production installation. It compiles fixed local scripts/styles with hash-only CSP. Does not serve as an import or save format.

## Tasks / test cycle

- [x] Session: write RED tests; implement createRoomSession(d) with view/attempt/undo/restart and bounded history; verify no-op attempts, terminal state, independent rooms, input snapshots and answer-free view.
- [x] Content: write RED existence/semantic tests; author six static JSON sources; independently derive all coded answers and configuration predicates, enumerate every reachable state, replay alternate branch orders and unique item movements. Bind reviewed source hashes.
- [x] Player: RED builder/CSP/escaping/duplicate/output tests; implement offline anthology, object/control/notes/help UI; actual-control tests for all six rooms at phone/desktop plus landscape, both story modes, stale events, restart/cancel, undo and hostile strings. Final focused and actual offline-file evidence is recorded in [ANTHOLOGY.md](ANTHOLOGY.md).
- [x] Publish one coherent six-room/player comparison PR on #480. PR #481 merged 17 October 2026 after the dedicated rehearsal, controls, Android and full workflows succeeded. An independent review comment found no correctness, security or data-loss defect; no formal GitHub `APPROVED` review or human/editorial approval is claimed.

## Planning-time rulings and constraints

At the 27 September planning point, no subagent capability was available, so implementation was planned inline and self-review was not independent. The local archive tree was old main `a3c6ad9`; the live publication base `ba8c888` preserved newer restore/testing work. The local dependency cache was incomplete, so full build/browser-origin evidence was deferred to a clean exact-source environment. These were planning-time limitations, superseded for the merged implementation by the later PR #481 exact-source CI recorded in [ANTHOLOGY.md](ANTHOLOGY.md). Proposed difficulty remains uncalibrated.

Items are represented once, as a location or an explicit grouped bracket configuration. Each clue states the fictional mechanism rules; no external physics/printmaking knowledge is required. Clock turns are an authored input abstraction, not an inaccurate animated simulation of sixty individually modeled ticks. Authored source and separate derivation oracle are checked independently.

## Execution ledger, historical

The foundation is published in #480. Its first dedicated CI passed the 52 tests and failed formatting only; exact-source formatter output was digest-checked and applied. The six-room increment passes 93 Node tests locally, including source-bound clue review, independent transition enumeration, alternate paths and bounded sessions. Eighteen DOM-loaded Chromium control scenarios passed; normal local file navigation is blocked by managed policy, so it remains a separate CI gate. No policy was bypassed and no origin acceptance is inferred from DOM controls.

Ruling at the time: publish the six-room player and content as one coherent comparison increment, rather than temporarily breaking tests between a two-room and four-room split. The foundation was independently reviewable in #480; each content source remained a separate file. Source hashes in anthology-review.json require an explicit clue/model review when text or rules change. This execution ledger records author review, not independent review.
