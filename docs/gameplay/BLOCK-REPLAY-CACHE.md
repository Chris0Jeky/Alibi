# Block Cabinet replay cache

Refs #404. This first slice removes repeated rule evaluation, not the 500-move cap.

## Cache contract

The engine owns one ephemeral entry: normalized seed, a bounded vector encoding
all slot/cell pairs, and its replayed state. Every call validates every move before
reuse. Equal history reuses the result; a matching prefix replays only new moves.
Undo, a different seed or any earlier divergence rebuilds from the initial state.
A failed replay never becomes the new entry. Every returned state is a deep copy,
so consumers cannot mutate future results. Nothing is persisted.

This is not a length/last-move cache: a restored log can change a middle move while
retaining both. It is not an unbounded map of games. Validation remains linear in
history length; costly placement and line-clearing work avoids the unchanged prefix.

## Evidence and byte limits

Two initial work-count regressions failed before caching. Eight moves across
repeated reads require eight rule evaluations, not sixteen; appending two after
eight requires ten total, not eighteen. Tests cover output mutation, middle edits,
malformed/sparse histories, undo/redo/branching, seeds, invalid append and actual
Club functions/reload. These are operation counts, not physical-phone timings.

The cache-only build exceeded the core-shell ceiling. An explicit null-prototype
run-default table removes eight duplicate branches without changing initial
seeds/modes/levels or existing-run ownership. Nine compatibility cases pin this.
Local locked-toolchain web builds measured core offline 1,892,404 to 1,892,455 bytes;
startup JS gzip 134,934 to 134,899; initial code plus content gzip 204,206 to 204,172.
All existing budget assertions pass. Reconstructed local Git metadata means these
are source-build comparisons, not release artifacts. Final-head hosted full CI,
actual Block controls and independent review remain merge gates.

## Remaining #404 scope

Keep maxMoves=500. Lifting it requires a long valid game, reload-at-cap tests,
constrained-browser measurements and explicit physical-phone qualification.
Saves, definition identity, seeded sequence and replay rules are unchanged.

## Landed optimization and long-run follow-up

PR #566 is merged as b80aa8f677d06bd022245541c16aad670888fa4f after all ten
workflows and independent review passed. The earlier pending statements above
record the original candidate stage. The full cabinet tested merge ref 62d55b8;
its tree matches reviewed head a2b246e exactly. The actual-head Games lane and
complete cabinet include real browser regression coverage. This is not deployment.

A deterministic synthetic 268-move game, seed CACHE-LONG-19, now provides longer
source coverage in tests/fixtures/block-replay-long.json. It was found with a
bounded test-only legal-placement search and checked against the unchanged
production move function. It is neither an official puzzle nor a human playtest.
The test does not search at runtime or assume every seed admits a long game.

```sh
node --test tests/block-replay-long.test.cjs
```

The four follow-up cases pin validity against an uncached production fold, exact
returned state, input preservation, full-prefix growth and corruption at move
200. Twenty independent reads of the 268-move log require 268 rule evaluations
instead of 5,360. Evaluating every prefix from zero through 268 requires 268
instead of 36,046 moves. All log validation and copying still occur, so these are
not total instruction counts or promises of a matching wall-clock speedup.

The four tests pass with the landed cache. Substituting the original uncached
engine reproduces two work-count failures while both semantic checks still pass.
No arbitrary timing threshold, larger cap, weakened legality or skipped test is
used. Existing source tests cover undo, redo, restore-shaped edits and deep-copy
isolation; this fixture extends their history length, not their browser claims.

Remaining acceptance still includes a valid run at the 500-move boundary,
real-origin reload/undo there, memory measurements and constrained/physical-phone
input latency. This below-cap fixture does not authorize lifting maxMoves and
must not close #404. Physical Android/TalkBack remains in HUMAN_TODO.md. The
current follow-up changes only a synthetic fixture, tests and this handoff.
