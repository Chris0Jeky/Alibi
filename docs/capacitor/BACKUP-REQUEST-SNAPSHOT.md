# Browser backup request snapshots

Fix for #359. Maintenance of CAP-03 (#125), with document transport tracked under #128.
`createDocuments().writeBackup()` now captures the filename, UTF-8 payload and
digest before validation and before the first asynchronous provider operation.
Validation, digest checks, picker arguments, stream writes and the returned
byte/readback receipt all use the same captured primitives.

Previously, callers could change the request while hashing, choosing a file or
writing. A different payload and matching digest could be written after only the
original payload had passed the 16 MiB limit. Changes during the committed write
could also make the receipt describe bytes that were not written. This is a
mutable-request race in the platform adapter, not a claim about an observed lost
player save or an Android Storage Access Framework implementation.

Four deterministic tests reproduce mutations during the digest, picker and write
phases, including a payload above the byte bound. All four fail on original web
adapter blob `73ecd8296cf8f0f3db1c04ade334047e27b6bbf7` and pass with the snapshot.
The shared adapter, native-fallback, bootstrap and application-feedback tests also
pass: 30 focused checks, no failures or skips. Tests use the real platform adapter
and Web Crypto, with controlled provider promises rather than arbitrary sleeps.

A fifth regression rejects a mutable filename object rather than relying on string
coercion. Filename, payload and digest must all be validated primitive strings.
No caller object is changed or frozen. File formats, save ownership, permissions,
operation cancellation/commit semantics, stream abort/close behavior, readback rules
and limits are unchanged. The change adds no native plugin or browser capability.

The affected source and its platform/test dependencies match the current GitHub
baseline. The local ZIP predates unrelated CSS and Night additions; it is not a
complete current-main workspace. The first full local run passed formatting, web
and Android preview builds and 547 Node tests; two tests failed because the
downloaded tool subset lacks `@capacitor/core` and `uuid`. No failure was waived. Require full exact-head Verify and Android payload checks,
plus independent review, before merge. Provider fixtures are not physical Android,
actual browser-picker or TalkBack acceptance. Retain the existing human gates.
