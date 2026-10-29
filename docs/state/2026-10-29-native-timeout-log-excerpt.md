# Native timeout diagnostics in CI logs

## Decision

The installed Android smoke already records a complete logcat artifact, including
`AlibiNativeSmoke` evaluation timing, heartbeat and main-thread stack information.
A failed workflow's visible log currently reports only the assertion's evaluation
number and stage. The artifact remains the detailed evidence, but an allowlisted
excerpt makes common timeout diagnosis possible when archive inspection is not
available. Printing the whole logcat would expose unrelated system output; adding
new runtime instrumentation is unnecessary for this diagnostic slice.

On failure only, the cleanup trap passes the existing logcat file through a small
filter. It matches the instrumentation tag, literal test stages (including nested
condition polls), structured timing and main state. Stack frames are reduced to a
fixed set of platform symbols or an unlisted-frame placeholder; source locations
and arbitrary identifiers are omitted. The tag is a filter, not authentication.
Expressions, results, unrelated tags and malformed payloads are omitted. It emits the most recent matching
lines, at most 40 lines and 8,192 bytes. Diagnostics are best effort and cannot
replace the original exit status; the complete existing artifact remains unchanged.
No emulator, offline, test, deadline or assertion behavior changes.

## Evidence and limits

The focused regression exercises actual cleanup code with successful and failed
commands, a logging failure, secret sentinels, oversized traces and the output caps.
It first failed without the collector and now passes. Existing native workflow
contracts pass. Full build and exact-head hosted native execution remain required;
these local fixtures do not prove an emulator or a physical Android device.

The platform renderer symbols use the `android.graphics.HardwareRenderer` package
and method names in [Android's source](https://android.googlesource.com/platform/frameworks/base/+/android-10.0.0_r40/graphics/java/android/graphics/HardwareRenderer.java).
This identifies frames, not a cause of the stall.

The #796 first native attempt (run 40811624871, job 123243017046) timed out at
`eval=11 stage=settings.click`; its successful single rerun does not explain that
failure. #785 remains open. The #798 earlier native failure (run 40812441177,
job 123245685736) was a Gradle distribution connection timeout before emulator
startup; this excerpt is not a fix for that network failure. Physical Android,
TalkBack and owner acceptance gates remain in HUMAN_TODO.md.
