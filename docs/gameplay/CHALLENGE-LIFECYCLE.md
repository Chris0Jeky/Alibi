# Curated challenge lifecycle follow-up

27 September 2026, refs #416. Base: `339f9e0e65aa0413f9a0dbdcdd7f3b84e67ff0f7`.
The owner requested broader gameplay work alongside the Interlock and Lattice collections.
This slice keeps completed routes stable and makes resumed Duel progress durable.

## Changes

A completed challenge rejects board input with a message directing the player to Undo or
Start again. Explicit Undo remains available. Any board interaction cancels an outstanding
finished-route reset confirmation, so the next reset attempt must ask again. An accidental
click is not permission to discard a solved route.

When opening a valid older Lantern Duel challenge whose log ends with Ink to move, the existing
bounded opponent settles the reply as before. If settlement adds moves, the host now receives
one cloned save immediately. An already settled run is not rewritten, an unopened fresh board
creates no save, and a mismatched challenge is rejected before settlement. The current storage
queue and compare-and-swap checks remain the sole persistence authority. A refused write is
still reported by the host; this change does not fabricate successful persistence.

Concurrent challenge-list and board opens now share one in-flight IndexedDB connection attempt.
The promise is cleared after settlement, preserving the existing recoverable session fallback
and protected timeout/blocked behavior. No database name, record version, replay, identity,
reward, rules or challenge definition changes.

## Delivery, not larger limits

The optional Quiet Wing was near its existing raw-byte ceiling. Its delivered CSS had still
been emitted with source whitespace. Use the already pinned esbuild CSS parser's whitespace-only
compaction for that asset. Do not enable syntax minification, remove declarations, change the
standalone source, add a dependency, or increase any numeric ceiling. The asset remains hashed
and included in the same optional cache manifest. A source wiring test covers the compiler
boundary; a built-asset test requires exact equality with the parser output and matching hash.

The focused CI builds both the unmodified PR base and the exact head with the same installed
lockfile toolchain. It records byte deltas and requires the complete Quiet Wing pack to shrink.
This is transfer accounting, not a claim about physical-device memory, latency or game feel.

## Verification and remaining scope

Local RED tests reproduced accidental changes to a completed Hanoi route, missing saved Ink
replies and three connection attempts for three concurrent opens. The CSS wiring regression
also failed before its fix. The combined source run passed 27 tests with zero failures/skips;
Python control-suite syntax also passed. The local source archive is older than main, but the
three edited implementation files match main's Git blob IDs before changes. Other release files
are not treated as an exact main checkout. Local npm installation failed with registry DNS errors;
no full local build or browser pass is claimed.

`.github/workflows/challenge-lifecycle.yml` checks out and records the exact PR head, runs full
verify and unchanged-budget checks, measures baseline/head delivery, then exercises the new
Hanoi/legacy-Duel scenarios plus existing challenge library, Quiet Wing and calm controls.
The new scenarios cover both 390px and 1280px, using actual buttons and synthetic real IndexedDB
records. The legacy reply must persist without another board move and reopen offline. All
failures remain failures, and receipts/screenshots are CI artifacts, not fabricated playtests.

Still open under #416: the Quiet Wing host retains its old challenge handle during route changes,
and same-ID A/B/A loads need a connected-host/epoch guard. Those host changes and delayed restore
navigation need a separate integration test; this PR does not claim them fixed. #407's durable
Archive completion set is a separate save-format decision, not addressed by these controls.

No new levels, human difficulty calibration, independent review, physical Android/TalkBack
acceptance, release or deployment is claimed here. Review final-head CI and representative
screenshots before merging; player/device gates remain in HUMAN_TODO.md.
