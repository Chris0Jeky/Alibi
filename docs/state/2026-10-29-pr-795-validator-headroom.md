# #795: recover validator headroom on the transfer branch

The Quiet absence-preserving rollback repair passed its focused transfer contracts
and targeted real-IndexedDB fixture, but its exact hosted head exceeded the existing
application, initial-delivery and net-shell limits. The candidate remained draft.

This follow-up ports only the shared pack-validator construction from #797. The
core-only API retains its existing engine scope and diagnostics; the extended API
retains dynamic engine dispatch, source detachment and uniqueness validation. The
older feature branch's unrelated reducer behavior is not replaced with main's.
No numerical budget, recovery schema, transfer authority or published ID changes.

## Reconciliation and evidence

The starting tracked source was reconstructed and matched the exact GitHub #795
tree d9b6a989d10254b7c417a4b585edce45a1d4933a at head
321465df43a67f99debccbd91f8f7af438a47b47. Only the validator hunks from the reviewed
main candidate were applied; the same equivalence tests accompany the port.

The eight focused validator and pack-cap cases pass on the feature candidate,
including late Bridges registration and separate core-only behavior. Clean full
build measurements, the transfer regressions and hosted checks for the final PR
head are reported in #795. A clean output directory is used without changing the
platform-identity guards. The earlier size failure is not considered resolved
until those measurements and tests pass.

## Remaining boundary

This can qualify a bounded repair for the unreleased #579 branch. It does not make
that feature safe for main: durable recovery restoration, ordinary-writer
admission/CAS, complete domain validation, destructive player acceptance and
current-main integration remain open. Physical and owner acceptance remains in
HUMAN_TODO.md. Existing absence/retained-state behavior and its limitations remain
documented in the companion issue-746 handoff.
