# Installed app test task scope

Native run [39304309175](https://github.com/Chris0Jeky/Alibi/actions/runs/39304309175)
at source `d681236746e7cf9b25678372bf7d49b405806c82` successfully discovered and
booted the AVD. The retained [artifact 12212523440](https://github.com/Chris0Jeky/Alibi/actions/runs/39304309175/artifacts/12212523440)
has independently checked archive SHA-256
`0cc41300b55c10c4826011c3679e7abfffccefc297608a0098ed04c317a25e12`.

Its app JUnit XML at
`android/app/build/outputs/androidTest-results/connected/debug/TEST-emulator-5554 - 16-_app-.xml`
records `tests="1" failures="0" errors="0" skipped="0"`. The single
`NativeOfflineSmokeTest.nativeHostBootsAndNavigatesOffline` case passed in
16.834 seconds. The device label's 16 refers to Android 16, not a test count.
That test checks the installed APK bytes before and after offline host navigation.

The root-level `connectedDebugAndroidTest` selector also selected instrumentation
tasks in the Android library projects. After the app result, the generated
`capacitor-cordova-android-plugins` library's
`checkDebugAndroidTestDuplicateClasses` failed on Kotlin stdlib 1.8.22 versus
stdlib-jdk7/jdk8 1.6.21. The overall command returned failure and the runner did
not create its final success receipt.

## Correction and scope

The runner now selects `:app:connectedDebugAndroidTest`, the installed app
instrumentation task used by the existing app-only report parser. Its regular
project dependencies still participate in app compilation and packaging. The
separate library test APK is outside this installed-host smoke; this correction
does not assert that the library's own instrumentation variant is qualified.

No dependency version, verification metadata, generated Gradle source, APK policy,
installed-digest assertion, offline control, boot deadline or cleanup rule changes.
The earlier broad compile/lint/build step is retained. A failure of the selected
app task still prevents final receipt construction and propagates unchanged.

The actual-runner Python fixture now requires exactly the qualified task, along
with the audited digest and strict dependency verification. Its normal and
instrumentation-failure cases fail against the prior task selection; all four
cases pass with the correction. The seven Node workflow guards and shell syntax
also pass. These command-stub tests are separate from the retained real app result.

The source-specific 1/1 app result does not turn the failed workflow green.
Fresh exact-head CI must produce a successful selected task, its bound final
receipt, unchanged-source checks and all other required repository results.
Broader OS/WebView, release-like install, lifecycle, transfer/recovery, physical
device and owner acceptance remain tracked in the existing CAP issues.
