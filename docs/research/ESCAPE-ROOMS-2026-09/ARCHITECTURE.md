# Escape-room architecture and integration decisions

Proposed architecture under #460. Implementations must provide their own exact-source receipts. A rehearsal file is not a released game, imported official pack or new production save authority.

## 1. Rehearse outside the host before extending published contracts

Current Castle objects validate inspect/note actions and room-open visibility. The evidence-case workbench validates claim/source dependencies. Escape rooms additionally need reusable items, reversible mechanisms and success conditions distinct from action availability. Extending either published contract casually would conflate different semantics.

Choose a bounded data-only rehearsal first. Do not rewrite the app or move existing Archive Heist levels. #467 supplies the eventual inspector adapter; #442 retains production lifecycle/save ownership; #433 retains collection delivery. No sixth store, automatic pack installation or startup-budget increase.

## 2. Two graphs answer different questions

An author-facing clue/dependency graph explains what the player can know and why a conclusion is justified. A finite transition graph explains what actions do and whether progress can still be completed. Neither substitutes for the other.

A transition proof that uses the authored correct input only establishes the mechanic's behavior after a correct deduction. It does not prove clue sufficiency. Conversely, a well-reasoned answer can still lead to a softlock when a resource was consumed in another branch. #468 and #465 deliberately own these separate receipts.

## 3. A deliberately small state contract

Experimental format: postern-escape-1. Positive explicit revision; stable IDs; paired story text; finite variables; visible objects and conditional observations; actions with availability, success conditions and assignments; terminal goal; separately authored hints and worked solution.

Initial ceilings: 256 KiB UTF-8 source; 8 variables; 2-6 values per variable; at most 4096 possible state combinations; 16 objects; 48 actions; 8 conditional observations per object; prose 1800, labels120 and answers64 UTF-16 code units. Unknown fields/versions, duplicate IDs, invalid domains and initially completed sources fail. No authored scripts, predicates, URLs or arbitrary HTML.

One item-location variable can take values such as cabinet, carried and installed. Reversible controls are ordinary transitions, not exceptions that bypass validation. Wrong input is a no-op. Availability is distinct from success: a player can attempt a visible mechanism in a wrong configuration without the interface revealing the correct setting by hiding the control.

These bounds describe an initial proofable model, not a maximum human difficulty. Rich logical deductions can culminate in a small number of state changes. If a future room exceeds the model budget, document the abstraction and proof limits rather than silently increasing caps or calling a truncated search complete.

## 4. Check every reachable state, not only one successful walkthrough

Explore the successful-action graph from the initial state. Traverse its reverse edges from all goals. A reachable state outside that winning set is a softlock. Retain a shortest route to such a state as an actionable author diagnostic. Report unreachable actions separately.

Default bounds are 4096 visited states and 196608 successful/no-op action edges. Exhausting a lower caller cap yields inconclusive, with no clean softlock count. Invalid input and failed mechanism attempts are explicit no-ops. Terminal states have no further action effects. A source SHA-256 binds the report to exact authored bytes.

The proof assumes the declared finite variables fully represent relevant state. It does not establish physical realism, network concurrency, clue fairness, rights, performance on a phone or enjoyment. A host adapter must test the real boundaries again.

## 5. Safe authoring preview, then real persistence

The proposed standalone preview uses native controls, text-node rendering and a restrictive hash-only content security policy. No external requests, accounts, analytics, localStorage or IndexedDB. The page says refresh resets progress. Explicit bounded undo and restart help rehearsal without pretending to supply durable recovery.

Player projections exclude correct inputs, effect maps and worked solutions. The offline source still includes them; no secrecy guarantee is made. Hint functions avoid answer-bearing fields, while human editorial review checks the hint prose itself for unwanted spoilers.

Production promotion must name route/data/lifecycle owners, save revision policy, CAS/stale-tab behavior, import-preview/cancel, backup/recovery, pending/error states, optional-install interruption and measured payload bytes. Replaying old actions against a changed room definition is not an acceptable migration strategy. Unknown future revisions remain protected.

## 6. Art, co-op and authorship grow after the mechanics are credible

A scene and a text object list should invoke the same actions. Optional illustrations/audio can enrich a reviewed room without adding required clues unavailable elsewhere. New asset work follows existing #46/#48/#52 provenance and size budgets.

A cooperative experiment begins with two offline views and a solo combined view under #451. Test latched versus simultaneous operations before networking. Shared puzzle actions need explicit conflict rules; a generic text merge is not safe game-state reconciliation. No required VR, AR, camera, microphone or runtime generative witness.

A creator workflow begins with source validation, a preview and reproducible broken-room repair tasks. A visual editor or public community library follows observed author needs and a separate rights/moderation decision. Do not grant official identity simply because a source passes structural validation.
