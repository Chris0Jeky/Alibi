# Issues #783 and #785: CI investigation

The full verify lane now caches completed APT audio package archives. The
native and scene behavior was not changed. Hosted qualification remains open.

## Audio provisioning (#783)

The [first failing job](https://github.com/Chris0Jeky/Alibi/actions/runs/40365650409/job/121722490312)
spent the entire 480-second audio setup allowance downloading signed Ubuntu
packages from azure.archive.ubuntu.com: the 8,998 kB libcodec2 package alone
took about three minutes before later downloads continued until timeout. The
[second job](https://github.com/Chris0Jeky/Alibi/actions/runs/40378312387/job/121767363928)
shows the same slow-download pattern and 480-second timeout. The issue's third
run currently exposes a successful latest attempt; that is not evidence that
its earlier attempt succeeded.

The full lane exercises audio decodability using `ffprobe` in
`tests/asset-audio.test.cjs`; omitting the tool would skip those assertions.
The cache holds archives in a dedicated directory, keyed by Ubuntu identity,
version, architecture, the ffmpeg package specification, and ISO week. A
compatible prior week can restore; APT still refreshes signed indexes and
selects and checks packages against them. The successful install and ffprobe
check precede saving, and partial downloads and locks are excluded. No empty
cache is saved; an exact hit is not overwritten. The eight-minute phase,
20-second termination grace, 45-minute job and audio assertions are unchanged.
A cold cache can still encounter the slow mirror. Weekly rotation allows a
later save to refresh stale dependencies, but does not update an exact hit
within that week. Cache service delays remain subject to the job deadline.

## Native emulator (#785)

`tools/run-android-smoke.sh` already waits for `sys.boot_completed` before
starting the offline instrumentation. The [latest attempt of the cited run](https://github.com/Chris0Jeky/Alibi/actions/runs/40446443152/job/122001461557)
logged `Failed to start Emulator console for 5554` at 04:05:00 UTC, then ran
and passed the named test at 04:05:07–04:05:16. This demonstrates that the
warning alone does not identify a failed startup or explain the earlier
WebView callback timeout. The [first attempt](https://github.com/Chris0Jeky/Alibi/actions/runs/40446443152/job/121998759678)
shows the warning at 03:56:51 UTC, instrumentation beginning at 03:57:09,
and its WebView evaluation timeout at 03:57:25. A retry or added WebView
warm-up is not supported by these observations; root cause remains unresolved.

## Scene tap (#712)

The [latest issue comment](https://github.com/Chris0Jeky/Alibi/issues/712#issuecomment-6407855837)
records that enhanced input diagnostics were merged while the missing-click
cause remained unresolved. No retry, assertion change, or assumed readiness fix
was introduced here.

## Local checks and remaining gates

- `python tests/test_android_smoke_runner.py`: four tests passed using command
  stubs; this is not an installed Android test.
- `python tests/test_ci_audio_dependencies.py`: six tests passed; they run the real setup shell
  against disposable APT and ffprobe stubs and checks workflow wiring. This
  does not exercise GitHub's cache service or APT's package verification.
- `node --test tests/ci-setup-phase.test.cjs`: failed at the file level without
  individual diagnostics in this environment. The earlier [#531 handoff](2026-10-26-issue-531-bounded-setup.md)
  documents an environment restriction on Node child-process execution; this
  run alone does not establish the reason for the failure.
- `bash -n tools/ci-audio-dependencies.sh` and parsing `check.yml` with PyYAML
  passed. `npm run verify` stopped at `prettier: not found` because dependencies
  are not installed in this isolated copy.
- No real APT installation, cache restore, emulator, hosted run, physical
  device, or complete `npm run verify` was performed. Hosted exact-source
  verification and independent review are needed for any proposed change.
- [HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative for physical
  Android, publisher, and owner acceptance.
