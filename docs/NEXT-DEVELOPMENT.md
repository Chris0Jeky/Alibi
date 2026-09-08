# Focused next development

## 1. Complete real-device release acceptance

Run the unchecked hosted/Android checklist first. Deliver an evidence table with browser/device versions, before/after saves, deployed build IDs and clear pass/fail. Do not add accounts to avoid a storage bug you have not diagnosed. Fix defects in isolated commits with regression tests.

## 2. Refine the puzzle experience

Measure time to first meaningful move, misinterpreted controls, clue re-reading, tool-mode errors and excessive board/evidence switching during human playtests. The mobile evidence drawer exists specifically to reduce that last problem. Difficulty should reflect the hardest required human deduction, not clue count alone. Current reveals consult the stored solution and are counted; a real logic explanation engine should produce a trace with named reasoning steps and cite the player's current constraints.

Prioritise richer curated scene geometry and a consistent casebook cast over generating hundreds more mechanically similar boards. Existing cases are standalone anthologies. A continuous mystery needs authored continuity, clue provenance, deliberate evidence handoffs and a narrative validation pass.

## 3. Improve authoring safely

Add draft history, draft export before verification, a clue consistency inspector, solver ambiguity highlights and a second-solution difference view. These are not implemented in 0.2.0. Keep the current distinction between a generated draft, a solver-verified puzzle and a human-approved publication. A graphical editor for every family is an appropriate later expansion, not something the JSON importer already supplies.

## 4. Refactor at clear boundaries

Split app.js into route/controller, player, workshop, settings/backup and PWA modules while keeping behaviour unchanged. Keep the dependency-free distribution if possible. Add types to definition/state/action contracts, comprehensive property-based reducer tests and regression fixtures for every fixed bug. Make renderer and lesson registration symmetrical with the engine registry before adding several more families.

## 5. Optional account sync, only when needed

Retain guest/offline play. Add an optional authenticated backup/sync API with explicit storage quotas, account deletion, conflict UI, idempotency and an offline outbox. Distinguish a saved snapshot from automatic reconciliation of ongoing work. Do not create public writable D1/KV endpoints or send anonymous notes to a backend by default. Pricing, retention and security need a separate current review when this work starts.

## 6. Optional Android distribution

Evaluate a PWA wrapper only after installed-browser usage identifies a limitation: store discovery, native purchase requirements or a specific OS capability. Then choose the packaging approach, signing-key ownership, package identity, update policy, privacy listing and save migration intentionally. A wrapper does not automatically share every browser's IndexedDB or solve backup.
