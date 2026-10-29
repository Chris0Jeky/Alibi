# Pending work composition: Castle, Workshop, CI and input regressions

This composition starts from main `4c72fc4a919cb7d83b454df5524aa5f32913decc`
and preserves the reviewed source and commit ancestry of these pull requests:

- #799 / `1b6f172dadf5a430b40422b06bc3d82dc305f374`: opt-in visit-local Castle receipt.
- #800 / `8ded7ee2e6308d7932344f14e97da48d7ae15ccb`: bounded native failure excerpts.
- #801 / `353fddf5a58d5a4291bae51ac3617b7939acf83a`: conservative native handoff-only scope.
- #802 / `3c082d957a96fbb598b2033566de6cec66a568e5`: advisory installed-collection status.

Two separately reviewed fixes are layered before composition: #803 keeps newer
external focus when a queued dialog close arrives; #804 retains a transient House
search draft through a same-route redraw. Both were reproduced against their
actual source before the fixes. Their focused regressions and independent reviews
passed. The browser fixtures use real controls and force the relevant ordering;
existing outcome, focus, search and offline assertions and deadlines remain.

## Composition boundaries

The final Workshop module is #802's full file, which already includes #799's exact
bounded receipt-module helper. It retains the strict 3,072-byte gzip limit; the
qualified #802 build measured 3,050. The build-only entry change passes the existing
store to the optional dialog. No additional startup fetch or status index is added.
The focus fix travels with all 13 source-catalogue hash updates. House query drafts
remain in memory and do not filter, change the URL or enter a save before submission.

The native classifier is absent from the trusted base, so this composition must run
the full native path. Its terminal result guard remains mandatory. The original smoke
script, timeout values, checks and failure artifact collection remain; #800 only adds
a bounded redacted excerpt after failure collection.

## Evidence and retained failures

Each lane's handoff contains its own source tests, measured limits and hosted results.
The #802 Workshop discovery workflow 40817104637 passed on its published head,
including fresh read-only status, stale tabs, offline operation and future-schema
preservation. The #799 Wrenmere workflow 40815187810 passed both viewport receipt
flows, explicit consent and offline return.

The first #800 full run 40814568363 / job 123252523832 and #799 full run
40815187851 / job 123254802953 failed existing Domino first-move focus assertions.
The #802 mobile run 40817104658 / job 123260641696 failed an existing House search
assertion. These failures are retained in #803 and #804. They did not capture enough
event/input ordering to establish their causes; the independently reproduced defects
must not be presented as proven explanations of those historical failures. The House
fixture now emits bounded failure-only state and rethrows the original exception.

Local Chromium was unavailable and disk space was exhausted during the final
composition. The previous 2,208-test combined build predates the new status, native
and focus/House changes and does not qualify this final source. Its exact-head
GitHub build, budgets, browser/storage/offline/update checks and native smoke must
pass before merge. Final qualification and merge tree receipts belong in the PR
discussion and workflow links; no previous-head result substitutes for them.

## Remaining acceptance

#455 still requires actual human playtest observations. #433 still has broader
restore, historical/future definition and physical-device memory acceptance. #133
still has wider OS/WebView, installed lifecycle and picker/recovery work. #785's
native draw timeout cause remains open. #401 requires an upstream consent boundary.
The origin-transfer #579 remains a separate draft with its documented concurrency
and durable recovery blockers. Physical devices, TalkBack, editorial decisions and
release ownership remain in HUMAN_TODO.md; this work claims no deployment or human
acceptance.
