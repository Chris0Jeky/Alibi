# Integrating the castle into Alibi

## Status and baseline

This package is not a patch that can be applied blindly to the current app. The prototype is executable in isolation and demonstrates a complete first-chapter loop. Connected GitHub reads were used to inspect the repository on 9 September 2026, but a full local checkout could not be obtained in this environment. No current-Alibi build, full test suite, merged PR or deployment is claimed.

The inspected repository reports version 0.7.0, thirteen families, 324 core puzzles, four casebooks and 59 separately stored/versioned challenges. It already has animated companions, six garden species, modular seeded towns, museum artwork, a lazy Quiet Wing and adaptive image delivery. This expansion should reuse those systems. See docs/PROJECT-MAP.md and the current top of docs/STATE.md in the real repository before doing any work; concurrent development can supersede this snapshot.

### Relevant source seams inspected

| Existing source | Existing responsibility | Castle integration direction |
|---|---|---|
| src/app.js | Native routes, player, notebook/settings, PWA lifecycle | Add a native estate entry and return context; keep quick puzzle access |
| src/activities.js | Lazy activity mount/dispose/flush; guarded navigation | Follow its lifecycle model; do not replace it with a global overlay |
| src/core.js, engines.js, bridges.js | Existing pure puzzle engines | Reuse for curated room tracks; preserve published definitions |
| src/storage.js | Revision-conditional core saves | Adapter reads validated committed records; preserve ownership and recovery |
| src/club.js, club-engines.js | After Hours experiences | Present existing games in appropriate rooms without duplicating records |
| src/quiet-wing/ | Independent reducers, presentation and storage | Museum/companion/garden/realm connections remain lazy |
| src/quiet-wing/pet-view.js | Animated companions and fallback | Future role/presentation work only after the deferred contract |
| src/quiet-wing/city.js, gpu.js | Seeded geometry and rendering | Reuse for the personal village, not the authored castle map |
| src/backup-validation.js, validator-worker.js | Bounded import/restore validation | Extend explicitly if estate state enters combined backups |
| tools/build.cjs, build-quiet.cjs | Hashed output, core and optional packs | Emit a lazy castle pack, retain atomic core shell and existing budgets |
| src/asset-delivery.js | Optional verified museum image detail | Reuse verified compact-first delivery; track #28 before expansion |

The exact route and completion APIs must be derived from the current checkout. This document does not invent a working `#/puzzles?family=...` route. Prototype garden, realm and pet links use the existing Quiet Wing paths, open the current site separately and do not exchange state.

## What to transplant and what not to transplant

The authored world records, puzzle rules, pure reducers, tests, scene geometry and story can be adapted. The standalone `src/app.js` owns the whole document, uses globals and an independent localStorage key for demonstration. Do not concatenate it into production, where it would compete with the app root and modal.

Introduce an estate activity module with explicit `mount`, `route`, `flush` and `dispose` responsibilities, compatible with the current activity coordinator. Give it host functions for opening an existing puzzle, resolving room content, reading committed progress, updating estate state, announcing feedback and reading effective preferences. All listeners, media, timers and pending requests belong to the mounted activity and must stop on disposal.

Only one authority should handle navigation. Preserve browser back/forward semantics and last-focused control when returning from a puzzle. The existing player should receive a bounded return context such as room ID and activity version, not untrusted HTML or a callback serialised into a save.

## Proposed host boundary

The accompanying `contracts/estate-host.ts` is an interface proposal, not compiled production code. It deliberately gives the estate no authority to rewrite puzzle saves. A production adapter should return a validated completion snapshot after the source transaction has committed. Subscribing to changes should allow reconciliation from that snapshot, not rely on receiving every event exactly once.

The event path is an optimisation; the committed records remain the authority. Content IDs are resolved through the trusted registry. A puzzle definition can belong to a room without being cloned under a different ID. A casebook can be catalogued as an existing work without retconning its people or objects into Wrenmere.

## State and migration

The standalone key is `alibi-wrenmere-prototype-v1`. It does not access alibi-device or any existing Quiet Wing/Club/challenge store. Prototype export is deliberately scoped and has no import UI. Storage contracts are unit tested with synthetic adapters. Real-origin persistence remains unverified in this authoring environment.

Production should use a reviewed versioned estate record or store with a documented owner. Preserve existing database identities and their current versions unless a separately justified, tested migration is required. Do not make the new module own the root service worker. Store stable IDs, versioned evidence and bounded player notes, not rendered HTML or screenshots.

For existing players, derive familiarity from the current validated official records where a clear semantic mapping exists. Do not invent a museum visit, the contents of an old hypothesis or a story deduction because the player solved a broadly similar puzzle. Existing items remain available. A new narrative can start with a short recap and optional investigation route.

Unknown fields/versions and ambiguous read failures must not be “repaired” by saving a blank state. Preserve raw records and offer clearly scoped export/recovery. A stale tab must not overwrite a newer notebook. If estate state and cosmetic entitlements cross stores, use the idempotent receipt/outbox design in #30 and explicit per-store recovery. Combined restore is not globally atomic.

## Build and asset strategy

Keep a compact, complete first-frame illustration with the estate content. Only enter the larger castle module when selected. Optional films should load on deliberate request, with a poster, visible captions, transcript and cancel/dispose behaviour. Do not embed the film into Alibi's initial JavaScript merely because this portable demo embeds it for convenience.

Use content-hashed assets in the existing release pipeline. Keep source illustrations and editable masters outside the runtime pack. Publish a manifest of bytes, hashes, licences/provenance and cache grouping. A core catalogue puzzle must remain usable without a castle film, 3D pet model or high-resolution museum image. No runtime asset provider account is required for this package.

Prefer illustrations with small, bounded ambient layers over a permanent whole-castle WebGL scene at first. The current SVG direction proves spatial identity without imposing a render loop. A later 2.5D or 3D presentation should be an enhancement with an equivalent navigable directory, not a prerequisite for the puzzle app.

## Suggested implementation slices

**C0: reconcile.** Read AGENTS.md, STATE.md, PROJECT-MAP.md, current open PRs and the relevant tests. Inventory what has changed since this review. Run the baseline verification before adding code. Preserve another agent's worktree and pending changes.

**C1: native estate shell.** Add the lazy module and native routes, illustrated map, room directory, preferences propagation and dispose/flush contracts. Do not yet connect rewards. Preserve the old home and direct puzzle routes. Prove navigation, focus, narrow layout and exit under a stalled optional request.

**C2: curated room bindings.** Register existing puzzle IDs in room tracks without altering their published definitions. Keep each record's original family and source. Add return-to-room context and committed completion reconciliation. Do not count the original 116, newer packs and casebook references multiple times.

**C3: first-chapter evidence.** Port the new original teaching activities as separately named content where needed. Do not describe the lantern-switch demo as Alibi's existing lightup engine. Add the evidence graph and opening synthesis, preserving clue-based hints and explicit solution reveals. Run graph reachability and actual-control solves.

**C4: museum and archive layer.** Adapt the three sourced exhibit activities into the existing Quiet Wing/curation architecture. Keep history, reconstruction and fiction distinguishable. Reuse current art and credits where appropriate. Add the era layer and complete non-visual equivalent before depending on it for any required deduction.

**C5: persistent estate acceptance.** Integrate notebook state, explicit backup scope, safe restore and update blocking. Run current core/Club/Quiet Wing origin and two-release suites plus new estate tests. Keep the physical Android incident open until actually retested.

**C6: narrative expansion.** Implement Chapters II–V incrementally, with independent clue review and human playtests. Author the final truth and evidence ledger before adding polished room scenes. A scene is not complete when its door works; its puzzle, inference, source, accessibility and return path must work too.

The companion/garden/city work is deliberately outside these slices and remains deferred under #29. Do not silently start it while implementing the castle.

## Required production evidence

Run the repository's current format/build/Node gate, puzzle and Club controls, Quiet Wing controls, real-origin persistence/offline/update suites and changed-seam regressions. Record emitted sizes without raising budgets simply to obtain a pass. Verify hosted asset responses and old-to-new upgrades on the existing Cloudflare origin before calling the feature live.

Test fresh, partly solved, fully solved and old-version states. Test two tabs, failed writes, future saves, no optional pack, reduced motion, mute, large text, keyboard-only navigation and missing WebGL. Verify all required story paths are reachable without an optional reward or external website. Retain #2, #11 and #13 for physical device evidence, #15 for garden import validation, #16 for preference gaps, #22 for backup scope and #28 for adaptive cache coordination.

A finished source PR is not a hosted release. A viewport-emulated pass is not a physical Android or TalkBack pass. The package's own reports do not replace the full app's tests.

## Things not to do

Do not replace the root app with this independent prototype. Do not change published puzzle IDs or rewrite old stories in place. Do not create a second manifest/service worker for the castle. Do not read arbitrary local packs as official reward authority. Do not fetch large films while a player is solving. Do not make all thirty-two planned rooms appear implemented. Do not close existing acceptance issues because the new art looks correct.
