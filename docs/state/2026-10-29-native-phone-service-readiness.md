# Android emulator phone-service readiness

The [first #774 native attempt](https://github.com/Chris0Jeky/Alibi/actions/runs/40801178987/job/123209395062)
passed native compilation, lint, APK checks and emulator preparation. Its smoke runner then
exited 20 with `cmd: Can't find service: phone` before starting instrumentation. The retained
native diagnostic artifact is `12866127084` (SHA-256
`98952278e8c0469a29e5f22f21590c111a9bf174fe5237e6bf861044fa85fbf4`).
This is not the WebView evaluation timeout in #785 and this change does not close that issue.

[Android's svc script](https://android.googlesource.com/platform/frameworks/base/+/eeff562a2975/cmds/svc/svc)
maps `svc data disable` to `cmd phone data disable`. The Android
[service command](https://android.googlesource.com/platform/frameworks/native/+/refs/heads/main/cmds/service/service.cpp)
returns `Service phone: found` only when the binder exists. The job log does not trace each
shell command, but the missing `phone` service and the runner's required data-disable step
identify a concrete readiness boundary before the offline setup.

The existing 90-poll, two-second boot loop now requires both `sys.boot_completed=1` and the
phone binder. Polls already spent waiting for boot are not restored for the phone service;
there is no additional wait loop or larger timeout. The original `adb wait-for-device` bound,
network-disable commands, airplane-mode check, instrumentation, assertions and receipts are
unchanged. Phase messages distinguish incomplete boot and missing phone service. A failed
service query propagates immediately; no network command or test is retried. The additional
ADB service queries take execution time, so the polling loop is an iteration bound, not a new
wall-clock deadline. Existing job limits remain unchanged.

The service can still disappear after the check, and its presence alone does not prove that
WebView is ready. The original network-disable commands and offline instrumentation remain
the acceptance checks. This change targets infrastructure readiness; it is not a guarantee
that this or future emulators will pass.

## Separate WebView failure on the first diagnostic head

On [job 123213862242](https://github.com/Chris0Jeky/Alibi/actions/runs/40802567805/job/123213862242),
source `a634f7d2b020a4fde37b1d66c939a79a8577cbeb`, both boot and phone readiness passed and
the installed test ran. Artifact `12867107433` (34,608,143 bytes, SHA-256
`1ba71dc128796dfc93669d82c06801d8ed0cf25f0be186e18f7b91f85dfd6c03`) records the failure.
Its XML and logcat show `eval=9 stage=settings.click`; boot, host identity and offline-ready
had passed. Evaluation dispatched at elapsed 124686 ms and returned from the UI invocation
at 124687 ms, but the callback was absent at 134687 ms. At timeout the main heartbeat was
10,001 ms old and the main-thread stack was in `HardwareRenderer.nSyncAndDrawFrame` during
view traversal. The callback arrived at 135026 ms, 339 ms after the test's deadline. The
renderer-termination log followed teardown; it does not establish the initiating cause.

The earlier [#784 failure](https://github.com/Chris0Jeky/Alibi/actions/runs/40446443152/job/121998759678),
artifact `12708757170`, reached `settings.ready/poll=1`, after the click had returned; its
heartbeat stopped for 10,001 ms with the same native draw stack and the callback arrived
605 ms after its deadline. These observations identify a recurring main-thread/draw stall;
they do not establish whether the trigger lies in the emulator environment, the app's rendering,
or their interaction. Console-start warnings also occur on a successful attempt.

The test now appends the existing sequence and stage label to the same JUnit timeout assertion
so job logs identify a future failure without requiring artifact download. The named test,
conditions, 10-second callback deadline, 60-second condition deadline and offline checks are
unchanged. This is a diagnostic follow-up, not a fix for #785 or evidence of a passing run.

## Verification

- Before implementation, delayed and never-ready phone regressions failed against the real
  runner: it made zero phone queries and proceeded when the service was absent.
- `python tests/test_android_smoke_runner.py`: nine tests pass using disposable command
  stubs. They exercise delayed readiness, never-ready failure before network/test actions,
  shared boot/phone poll budget, unchanged offline command order, failure status propagation
  for phone-query, Wi-Fi and instrumentation failures, and emulator cleanup.
- `python tests/test_android_smoke_evidence.py` passes seven tests. `bash -n
  tools/run-android-smoke.sh` and Python compilation pass. The runner and test
  original Git blob hashes match #774 head `259415a54c973d941dc0631863a1dea2e58f021f`.
- No installed Android emulator was run locally; exact-head hosted native qualification and
  independent review remain necessary. The original failed attempt remains evidence, and a
  later passing run would not erase it. Existing [HUMAN_TODO.md](../../HUMAN_TODO.md) physical
  device and owner gates remain open.
