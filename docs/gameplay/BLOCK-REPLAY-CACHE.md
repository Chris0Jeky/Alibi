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
