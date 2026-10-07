# Origin-transfer rollback scope

Review follow-up to #579, based on its exact head
`3cec6a3270008ad80f1a9db8f803e7a449fd36bc`. The complete local production
source was checked against Git blob `e15820120ad879e87ebc3a227648b8fe87aea2bc`
before reproduction. This is a child of that unmerged feature, not a feature
added directly to main and not an approval of the parent.

## Reproduced data-loss path

An import snapshots all five domains, writes Cabinet, then fails while writing
Club. Another writer has advanced Quiet Wing while the import was pending.
The previous catch block wrote the old snapshots into all five domains,
overwriting the new Quiet Wing progress even though the import never reached it.
The same defect is observable at each of the first four interruption boundaries.
These are deterministic coordinator tests with independent-domain ports, not a
claim that a physical device or real IndexedDB transaction was exercised locally.

## Bounded repair

Record a domain immediately before attempting its write. On failure restore and
verify only the attempted prefix, including the throwing domain because a write
may fail after partially changing its storage. Preserve the full recovery copy
and the explicit incomplete-restoration error. Successful imports still write
all five domains and release recovery. Cancellation and read/retain failures
perform no domain writes. Existing input and database formats do not change.

Ten tests exercise all five write boundaries plus success, confirmation,
read/retain failure and failed rollback. Before: 4 failures, 6 passes. After:
10 passes, zero failures/skips. Reintroducing writes to untouched domains and
moving the attempted marker after the write each make the tests fail. Both
mutation checks were run and the repaired source was rerun afterwards.

## Remaining parent blockers and limits

This prevents rollback from reaching an untouched later domain. It does NOT
provide compare-and-swap against a concurrent writer in an already-attempted
domain, coordinated quiescence of all five owners, or crash-atomic multi-database
restoration. The parent's direct Quiet Wing/Castle/Challenge writes and complete
section validation still require independent safety review and actual-origin
failure tests. A matching checksum is not semantic save validation. Keep #579
and this child unmerged until those gates and the normal review/CI gates pass.

The local dependency installation failed resolving registry.npmjs.org. No local
pinned formatter, complete application build, budget, native-browser, Android,
TalkBack or deployment pass is claimed. The read-only workflow checks the exact
head, both old and new transfer tests, pinned formatting and full verification;
its result is a separate receipt. HUMAN_TODO.md remains authoritative.
