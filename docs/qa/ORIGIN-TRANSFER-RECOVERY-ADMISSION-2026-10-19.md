# Pending origin-transfer recovery admission

Bounded follow-up to #579 at `ceb14c870b240900070ad7f8c33a16bf685a4a72`, source
blob `ecaa0ebb8c6c68efc5f43bd38b05cc68836279f7`. The only runtime change is
`copies.put(snapshot, 'pending')` to `copies.add(snapshot, 'pending')` inside
`retainRecovery()`'s existing readwrite transaction. No pre-read or truthiness
test establishes admission: any existing key rejects instead of being replaced.

`applyOriginTransfer()` already awaits retention before recording or attempting
any domain write. A losing admission therefore performs no domain writes,
rollback or recovery release. The original pending copy remains available.
The coordinator's attempted-prefix repair and all open/transaction error paths
remain unchanged. No error is specially caught or reclassified by this repair.

## Executed evidence

Eight new Node groups execute the actual exported recovery port against a
transaction model supporting both add and put, serialized commit and abort.
They cover first retention; existing-copy preservation; present null, empty
string, false, zero and unknown records; coordinator refusal before writes or
release; two contenders with one admission; injected open/transaction quota
errors preserving their error objects; release followed by another admission;
and an aborted transaction admitting nothing. Against the published source,
four groups fail and four pass. With add, all 33 transfer groups pass, including
the previous 25. The existing open-lifetime mock supports add without dropping
its original error and close checks.

The standalone Chromium 140.0.7339.16 fixture uses two tabs and actual IndexedDB
recovery-store transactions. It verifies the retained snapshot survives a
second confirmed coordinator attempt with zero domain writes/releases; all five
falsy/unknown controls remain protected; successful release permits admission;
and two broadcast-started contenders produce exactly one committed snapshot.
An explicitly aborted real transaction admits no snapshot. The domain ports are
synthetic counters. On the published put source, the browser instead performs
five domain writes and one release and fails the refusal assertion. No player
import, real quota exhaustion or whole-device recovery is claimed.

Review tightened the final browser assertion to require count('pending') == 0,
which distinguishes an absent key from a stored null. The earlier fixture passed
the Chromium run above. The amended assertion is syntax-checked but was not run
locally because that browser executable became unavailable; fresh hosted browser
qualification is required for this final fixture.

The existing safety workflow runs the new browser fixture and archives its log,
hashes the additional input, and triggers on its changes. Full verification,
the pinned dependencies/actions and final source checks remain required.

## Budget and remaining parent gates

The source remains 16,268 bytes. Pinned esbuild 0.28.2 with the build's options
(`minify: true`, `target: 'es2022'`) emits 8,905 bytes before and after the change;
isolated emitted gzip moves from 3,104 to 3,106 bytes. This is not a whole-app
rebuild or new budget pass. No ceiling is changed, and fresh exact-head CI must
qualify the result against every existing gate.

Any retained pending record now refuses another import, including after a failed
import whose rollback succeeded. This deliberate refusal protects the original
copy; it does not add the missing inspect/export/restore UI or startup recovery
gate. The fixture explicitly clears its disposable records between cases.
Normal production release still occurs only on the existing success path.
Concurrent ownership of attempted domains, semantic/namespace validation,
crash recovery, cleanup status and export/fallback consistency remain separate
parent blockers. This child does not qualify the full #579 feature for main.
