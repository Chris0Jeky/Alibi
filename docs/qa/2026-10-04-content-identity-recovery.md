# Full-content identity recovery

Historical recovery checkpoint at111439bf8865b3dd957b02fb24d2eeb4516437f4.
The source tests and inspection below describe that checkpoint, not current
merge acceptance. See [STATE](../STATE.md) and the subsequent
[Android audit correction](2026-10-04-android-content-audit.md) for current gates.
Workshop #570 has since merged as f084aa6; the #571 handoff is incorporated into
#459 at55180ff7, rather than remaining a prerequisite sibling PR.

Refs #459 and #389 item 3. The original two commits and design are retained.
The recovery integrated their bounded change with #570's build rather than
replacing the modern build with a September snapshot.

The existing initial-content script already names the deferred chunk by a
truncated content hash. Ordinary deferred edits therefore affected the old
identity indirectly. This hardening explicitly hashes a versioned JSON frame
containing the complete initial and deferred source strings, with named roles
and unambiguous partition boundaries. It does not change rules, save ownership,
pack identities or automatic installation.

The helper was applied to platform-identity.cjs, preserving the newer
rollback/cleanup behavior in writeIdentity. The Workshop composition,
optional output accounting, full-hash metadata and source validation stay intact.
At this checkpoint, the build file differed from #570 only by importing the helper
and invoking it for contentManifestRevision. Its prepared blob was
`554f73addac79043919247032a59846d40cd3cc9`, checked against local bytes before
attaching it to the branch. No unrelated service-worker edit was included.

Six recovered source tests gave five failures and one pass against the unmodified
helper, then all six passed after integration. With seven dirty-path tests,
thirteen passed without skips or failures. Formatting passed; no source assertion
was removed. The original web/Android generated-output tests were retained
byte-for-byte and require actual emitted files, not missing-file skips. At this
checkpoint they had not run locally on the complete integrated application.
Later hosted audit results are recorded separately, not retroactively inferred.

The runtime web identity and inherited Android runtime identity share the new
aggregate. Android's separate legacy artifact receipt records the initial file
hash under its existing contract. The preview-house source-only identity remains
separate. This compatibility boundary required the later verifier correction;
the initial helper change alone was not complete Android audit integration.

Recheck final-head CI, actual web/Android identities, budgets, update/offline
acceptance and independent review before merge. The #570 dependency is fulfilled;
#459's incorporated #571 handoff must land with the corrected audit. Practice
counts remain in unmerged #572 and #389 stays open for both outstanding slices.
Physical Android/TalkBack and deployment are not claimed. No numerical ceiling,
dependency or production permission changes are authorized by this record.
