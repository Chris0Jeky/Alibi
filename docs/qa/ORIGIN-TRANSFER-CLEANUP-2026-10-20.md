# Committed origin transfer with pending recovery cleanup

Bounded follow-up to #579 on feature head
`98821bb22dfe2b06b3d175fa1565a4fe8dc1050a`. This child targets the existing transfer
branch; it does not qualify the feature for main.

## Behavior

After all five domain writes commit, failure to delete the retained recovery copy
must not turn that committed import into a generic failure. Previously the release
exception escaped to the confirmation handler, which left stale in-memory writers
running against the newly imported data.

The coordinator now returns `{ committed: true, recoveryPending: true }` when
recovery release throws or rejects, and the same result with `recoveryPending:
false` after clean release. Domain-write failures retain the existing rollback and
error path. No rollback is attempted after committed writes merely because cleanup
failed. The actual confirmation handler reports successful import with pending
cleanup and reloads in both committed outcomes. Failed imports still report their
error without reloading.

The warning is a transient toast immediately before reload. A durable startup
recovery notice and inspect/export/restore controls remain missing in the parent;
this change does not claim that a player can resolve retained recovery through UI.

The three existing delete-only IndexedDB paths share a private helper. It opens
only an existing database, preserves missing-database/store no-ops, awaits the
delete transaction, propagates its error, and closes the handle in `finally`.
Quiet fallback ordering and Castle record semantics are unchanged. This removes
duplicate code to retain the existing application and shell ceilings.

The asset catalogue's thirteen teaching records now carry the updated app-source
byte count and SHA-256. Existing lesson screenshots, design identities, rights and
counts are unchanged; this refreshes source receipts after the handler edit.

An isolated clean Android build with the reviewed runtime measures 138,462 bytes
of application gzip against the unchanged 138,464 ceiling, 207,805 bytes of initial
gzip against 207,840, and 1,422,944 bytes of net precache shell against
1,423,144.32. Hosted final-head budgets remain required; the application margin is
only two bytes. No budget is increased.

## Evidence

The initial regression has six groups covering clean release, asynchronous and
synchronous cleanup failure, and the shipped confirmation handler's committed and
unsuccessful paths. Four groups fail against the previous runtime and all six pass
with this change. The complete transfer suite passes 44 groups after adding a
transaction-model regression that aborts only recovery deletion. It proves all five
new domain values remain committed, the original recovery snapshot survives, no
rollback starts, and both retention and release handles close.

The standalone two-tab browser fixture adds the same deletion-abort boundary using
real IndexedDB retention and release. Only `copies.delete('pending')` is aborted;
the actual coordinator must report committed/pending, and the other tab must read
the unchanged original recovery record. Successful later release clears that
disposable record. The domain ports remain synthetic counters, so this is not
destructive five-domain player-import acceptance. Python and embedded JavaScript
syntax checks pass; fresh hosted execution of this scenario is required.

Independent source review found no blocker in committed-result handling or the
shared deletion helper. Its suggestions to retain `finally` coverage around the
store check and explicitly exercise an aborted deletion were incorporated.
Fresh exact-head full verification and the existing origin-transfer safety lane
remain merge gates. No assertion, byte ceiling, dependency pin or workflow gate
is relaxed.

## Remaining parent gates

The parent still needs crash/restart recovery and usable recovery controls,
coordination with normal writers during apply and rollback, semantic validation of
each domain while preserving unknown/malformed data, fresh Quiet/Castle/Challenge
exports, reliable Quiet fallback synchronization, reconciliation with current
main, and complete destructive browser acceptance. Physical devices and the
broader HUMAN_TODO.md acceptance remain separate. No deployment is performed.
