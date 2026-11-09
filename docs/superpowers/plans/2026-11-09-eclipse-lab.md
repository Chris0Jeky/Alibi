# Eclipse Lab Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the player/delivery work; the pure model is delegated to an isolated writer and reviewed on integration.

**Goal:** Deliver four playable Sun & Moon-inspired experiments with safe local progress and explicit local feedback, alongside the separately reviewed classic expansion.

**Architecture:** A pure bounded model and immutable puzzle set feed one shadow-root player. The existing optional-activity lifecycle mounts it at `#/quiet/eclipse`; a build-only pack emits hashed script assets with separate byte accounting.

**Tech Stack:** Plain JavaScript/ES modules, Node test runner, existing esbuild/Prettier, Python Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-eclipse-lab-design.md`

## Global Constraints

- Preserve existing IDs/revisions, saves, budgets, DB version and origins.
- Do not read authored solutions in checks or hints.
- Do not send ratings, feedback or progress automatically.
- Keep all new engine and player data bounded; distinguish indeterminate from unique.
- Keep physical-device, human-playtest and deployment evidence separate.

## Review Focus

1. Future/malformed stored data survives attempts to play and export.
2. Another tab's write cannot be silently overwritten; session edits remain exportable.
3. Optional download failure and late route changes do not mount into an abandoned view.
4. Fixed marks cannot be changed by brush, group fill, undo, restore or keyboard.
5. New feedback, storage and puzzle UI works with keyboard and at 320px without relying on color.

## Tasks

### 1. Pure model and authored experiments (delegated)

Files: `src/eclipse-lab/model.mjs`, `puzzles.mjs`, generator, model/content tests and research note.
Interfaces: `MODES`, `validatePuzzle(p)`, `check(p,cells)`, `solve(p,cells,{maxNodes})`, `hint(p,cells)`, `component(p,cell)`, `applyMark(p,cells,{cell,value,linked})`; `PUZZLES` has 32 definitions.

- [ ] Write failing model contracts and independent small-board oracle.
- [ ] Implement bounded rules and linked-group transactions.
- [ ] Curate and independently prove 8 levels per mode; document rejected prototypes.
- [ ] Run focused tests and commit coherent model/content pieces.

### 2. Versioned local state and feedback

Files: `src/eclipse-lab/storage.mjs`, `tests/eclipse-storage.test.mjs`.
Consumes validated definitions; produces `createStore({storage,locks})` with async load/update, export and restore, status and protected-data handling. Data format has schema 1, bounded `runs` keyed by `id@revision`, with pinned puzzle, board, undo/redo and local rating/feedback.

- [ ] Prove malformed/future bytes, quota denial, fixed-clue edits and stale writes are rejected without deleting originals.
- [ ] Implement whole-record validation, serialized Web Lock writes and exact previous-byte comparison.
- [ ] Provide explicit snapshot/export and reviewed restore with pre-restore recovery; never overwrite unknown records.
- [ ] Run storage regression tests and commit.

### 3. Player, discovery and delivery

Files: `src/eclipse-lab/player.mjs`, `style.css`, `entry.mjs`, `tools/build-eclipse.cjs`, `tools/build-quiet.cjs`, `tools/build.cjs`, `src/activities.js`, `src/app.js`.
Consumes model/store APIs; produces activity `mount({root,preferences})` handle with `route`, `flush`, `dispose`, `setPreferences`, `focusDestination`.

- [ ] Add lifecycle tests for lab entry, stale-route cancellation and update flush.
- [ ] Implement four game cards, level selection, board/clues, brush and linked-group actions, history, checks/hints and feedback/export/restore.
- [ ] Add minimal discovery links; integrate the hashed optional pack and measured accounting without raising existing budgets.
- [ ] Exercise actual emitted controls at phone and desktop sizes; inspect screenshots.

### 4. Review, publish and qualify

- [ ] Integrate reviewed model/content; refresh only source-dependent catalogue metadata.
- [ ] Run build/format/Node and relevant browser suites with a clean source receipt.
- [ ] Publish through the GitHub connector on draft branches; reconcile against current main first.
- [ ] Obtain an independent review, inspect all checks against the exact head, resolve blockers and merge qualified PRs.
- [ ] Record per-PR handoffs and any follow-up issues; retain HUMAN_TODO owner gates.
