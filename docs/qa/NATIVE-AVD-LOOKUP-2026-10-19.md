# Native AVD lookup continuation

The retained artifact from native run 39272618305 at `33dd3d2` has ZIP SHA-256
`a9a0cffda620d8878cf89494e1ba9c7694af6687e3207d692e7e9cbf9a222b4b`.
Its emulator log reports `Unknown AVD name [alibi_native]` and a missing
`alibi_native.ini` in the searched home. The emulator did not boot; retained
logcat contains only `- waiting for device -`. The previous unbounded EXIT
logcat cleanup explains why this failed launch could hold the job until its
35-minute cap. The separately reviewed cleanup bound is retained unchanged.
The artifact does not establish which directory avdmanager actually used.

The smoke runner now creates one fresh AVD home under `RUNNER_TEMP` (or the
system temporary directory outside CI), exports `ANDROID_AVD_HOME` to both SDK
tools, and supplies an explicit data path within it. It requires the locator
file and records the emulator's AVD listing before launch. A missing or
undiscoverable `alibi_native` fails before adb waits or instrumentation. AVD
images stay outside `test-results/native`, so diagnostics do not upload them.

Android's [environment-variable reference](https://developer.android.com/tools/variables)
documents `ANDROID_AVD_HOME` as the AVD directory and first emulator lookup
location. The [avdmanager reference](https://developer.android.com/tools/avdmanager)
documents the explicit AVD data-path option. The installed command-line tools
and emulator versions remain unchanged by this repair.

`tests/test_android_smoke_runner.py` executes an unchanged copy of the actual
shell runner with disposable command stubs. Inherited SDK user, emulator and
legacy homes deliberately differ. Four cases fail against the prior script,
then pass with the fix: shared-home normal handoff; missing locator refusal;
unlisted AVD refusal; and instrumentation failure status 23 with normal logcat
and owned-process cleanup. The normal case checks that the inherited homes are
untouched, the audited digest reaches Gradle and the final receipt command, and
Wi-Fi/data disabling remains in the handoff. The missing cases call neither adb
nor Gradle. The native workflow invokes these tests before using real SDK tools.

These are runner-contract regressions, not a real AVD boot or installed Android
acceptance. Fresh exact-head native CI must still establish the real lookup,
boot, offline instrumentation and bound receipt. No existing deadline, cleanup
bound, APK digest, manifest, dependency or installed-byte gate was relaxed.
