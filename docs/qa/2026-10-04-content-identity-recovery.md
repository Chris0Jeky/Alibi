# Full-content identity recovery

Refs #459 and #389 item 3. The original two commits and design are retained.
The recovery integrates their bounded change with #570's current build rather
than replacing the modern build with a September snapshot.

The existing initial-content script already names the deferred chunk by a
truncated content hash. Ordinary deferred edits therefore affected the old
identity indirectly. This hardening explicitly hashes a versioned JSON frame
containing the complete initial and deferred source strings, with named roles
and unambiguous partition boundaries. It does not change rules, save ownership,
pack identities or automatic installation.

The helper is applied to current platform-identity.cjs, preserving the newer
rollback/cleanup behavior in writeIdentity. The modern Workshop composition,
optional output accounting, full-hash metadata and source validation stay intact.
The build file differs from #570 only by importing the helper and invoking it for
contentManifestRevision. Its prepared blob is
`554f73addac79043919247032a59846d40cd3cc9`; this was checked against local bytes
before attaching it to the branch. No unrelated service-worker edit is included.

Six recovered source tests give five failures and one pass against the current
unmodified helper, then all six pass after integration. With seven current dirty
path tests, thirteen pass without skips or failures. Formatting passes; no source
assertion was removed. The original web/Android generated-output tests are retained
byte-for-byte. They require actual emitted files and independently recompute the
frame digest; missing files fail rather than skip. They have not yet run locally
on the complete integrated application. The dedicated read-only hosted lane must
build both targets and run those tests plus existing identity/budget checks.

The runtime web identity and inherited Android runtime identity share the new
aggregate. Android's separate legacy artifact receipt still records the initial
content file hash under its existing contract. The preview-house source-only
identity remains separate. This is an explicit compatibility boundary, not an
assertion that every field with the same name now has identical semantics.

Recheck final-head full CI, actual web/Android identity receipts, existing budgets,
update/offline acceptance and independent review before merge. #570 must land
first. The original dated plan's earlier results remain historical. Practice
counts are handled separately in #572; #389 must stay open until its complete
implementation scope is qualified. Physical Android/TalkBack and deployment
are not claimed. No numerical ceiling, dependency or production permission changes.
