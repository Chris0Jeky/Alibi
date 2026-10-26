# Issue #467: escape-room adapter for the Castle inspector

## Scope

This slice adds the memory-only adapter, the Castle host binding, and the ADR
([CASTLE-ADAPTER.md](../escape-rooms/CASTLE-ADAPTER.md)). Each room source maps to Castle inspector
objects, an inventory, and list and inspector markup that render the same stable action handles.
The adapter refuses stale handles and keeps per-room sessions with route tokens. `escape-session.cjs`
gains a read-only `state()` copy. Published Castle content, room sources, saves and byte ceilings
are unchanged.

## Evidence

- `node --test tests/castle-escape-room.test.mjs` covers seven tests across all 648 reachable states
  of the six rooms. It checks list and inspector action equivalence, no-op unoffered handles, exact
  undo, inventory against `held` variables, no item cloning, stale hidden-object controls,
  revision mismatch, A/B/A route tokens, notebook compatibility and escaped hostile text.
- Mutation checks: removing the route-token guard, the room/revision scope guard or the item
  derivation each fails at least one test.
- The Castle entry bundle measured 99,515 bytes both before and after the change (ceiling 101,120).

## Not verified

The adapter is not mounted in the shipped Castle, because room data delivery belongs to #433 and
the bundle ceiling has about 1.6 KB of headroom. Real-document focus return, screen reader and
physical device behaviour, durable persistence under #442, and the full `npm run verify` /
Android build were not run for this change.
