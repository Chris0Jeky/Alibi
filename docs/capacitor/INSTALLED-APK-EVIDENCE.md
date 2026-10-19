# Installed APK evidence binding

Refs #120/#133 and the independent review of PR #485. This is test infrastructure,
not a new production plugin, permission, save store or signing identity.

## Failure and repair

A source SHA in an emulator receipt does not identify the installed binary. Gradle's
connected test task may rebuild the application after the static APK audit. The smoke now
prepares an expected digest from the existing successful debug-package audit, verifies the
local APK still matches it, and passes that immutable digest as an instrumentation argument.

The actual Android test hashes its target application's installed `sourceDir` before launch
and after the existing offline navigation checks. It refuses unexpected split packages,
missing/malformed arguments and any digest mismatch. The helper uses minimum-OS-compatible
streaming Java APIs and lives only in `androidTest`, not production code. This also works when
Gradle uninstalls the app after testing: evidence does not depend on a later `pm path` query.

The runner removes only its synthetic connected-test reports and prior smoke receipt before
execution. Receipt construction requires the exact successful class and method, rejects failed,
skipped, disabled, duplicate and absent reports, rechecks the APK, and records both APK and
package-audit digests. Rewriting the audit and APK after preparation cannot replace the original
expected digest. The receipt remains explicitly emulator-only and non-production.

## Tests and evidence limits

Seven Python test groups exercise synthetic audit/connection reports, altered files, malformed
fields and changed build identities. A separate Python-driven JVM test compiles and executes the
exact hashing helper against correct, truncated, missing and wrong-digest files. Both passed
locally after the new tests first failed because the helpers were absent. These checks establish
helper behavior, not an installed Android pass. Source wiring checks bind the argument, on-device
calls, cleanup and CI invocation to these tested helpers.

Actual Gradle compilation, package audit and emulator execution remain current-head CI gates.
At the preceding head, run 36637313720 failed because the published CLI's generated Cordova
script did not match the initially reconstructed fixture. The gate correctly refused it; the
workflow now retains those actual inputs for comparison rather than weakening the hash policy.
The earlier Maven metadata verification blocker also remains separate. Strict verification is
retained, with verbose dependency reports preserved. No physical Android/TalkBack result or
release approval follows from any synthetic receipt or source test.
