#!/usr/bin/env bash
# Fresh CI AVD only. No physical devices, signing keys or user saves are used.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/test-results/native"
GPU=swiftshader
GPU_CANARY=0
case "${1:-}" in
  '') ;;
  --gpu-canary=swiftshader|--gpu-canary=swangle)
    GPU="${1#*=}"
    GPU_CANARY=1
    OUT="$OUT/gpu-canary/$GPU"
    ;;
  *) printf 'Unknown native smoke option: %s\n' "$1" >&2; exit 2 ;;
esac
mkdir -p "$OUT"
TRACE_ATTEMPTED=0
TRACE_DEVICE=/data/misc/perfetto-traces/alibi-native.pftrace
# A fresh directory keeps this invocation distinct even if older evidence cannot be removed.
if TRACE_OUT="$(timeout --signal=TERM --kill-after=2s 5s mktemp -d "$OUT/draw-trace.XXXXXX" 2>/dev/null)" &&
  printf 'start=not_attempted\n' > "$TRACE_OUT/draw-trace-status.txt" 2>/dev/null; then
  printf 'native trace output=%s\n' "${TRACE_OUT##*/}"
else
  TRACE_OUT=''
  printf 'native trace output=unavailable\n'
fi
TRACE_STATUS="$TRACE_OUT/draw-trace-status.txt"
# Keep the original audited digest across Gradle's potentially rebuilding install step.
EXPECTED_APK_SHA256="$(python tools/android-smoke-evidence.py prepare)"
# A failed or skipped run must not reuse an earlier success receipt/report.
rm -f "$ROOT/test-results/native/emulator-smoke.json"
rm -rf "$ROOT/android/app/build/outputs/androidTest-results/connected"
export ANDROID_SERIAL=emulator-5554
SDK="${ANDROID_HOME:?Android SDK is required}"
export PATH="$SDK/platform-tools:$SDK/emulator:$SDK/cmdline-tools/latest/bin:$PATH"
test -e /dev/kvm
sudo chmod a+rw /dev/kvm
# Give both SDK tools one fresh AVD locator, independent of inherited user homes.
ANDROID_AVD_HOME="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/alibi-native-avd.XXXXXX")"
export ANDROID_AVD_HOME
printf 'no\n' | avdmanager create avd --force --name alibi_native \
  --package 'system-images;android-36;google_apis;x86_64' --device pixel_6 \
  --path "$ANDROID_AVD_HOME/alibi_native.avd"
test -s "$ANDROID_AVD_HOME/alibi_native.ini"
emulator -list-avds | tee "$OUT/avds.txt" | grep -Fx alibi_native
emulator -avd alibi_native -port 5554 -no-window -no-audio -no-boot-anim \
  -no-snapshot -gpu "$GPU" -memory 2048 > "$OUT/emulator.log" 2>&1 &
EMU_PID=$!
cleanup() {
  local exit_status=$?
  if test "$TRACE_ATTEMPTED" = 1; then
    {
      printf 'stop_host_utc=%s\n' "$(date -u +%FT%TZ)"
      printf 'stop_guest_uptime='
      (ulimit -f 1024; timeout --signal=TERM --kill-after=2s 5s adb shell cat /proc/uptime) || printf 'unavailable\n'
    } >> "$TRACE_STATUS" 2>/dev/null || true
    if (ulimit -f 1024; timeout --signal=TERM --kill-after=2s 15s adb shell perfetto --attach=alibi-native --stop) >> "$TRACE_OUT/draw-trace-commands.log" 2>&1; then
      printf 'stop=ok\n' >> "$TRACE_STATUS" || true
    else
      printf 'stop=failed_or_expired\n' >> "$TRACE_STATUS" || true
    fi
    # Even if stop failed, an expired session may have written a trace. It is not proof of coverage.
    # The on-device ring is 32 MiB; independently cap a broken or oversized pull at 64 MiB.
    if (ulimit -f 65536; timeout --signal=TERM --kill-after=2s 20s adb pull "$TRACE_DEVICE" "$TRACE_OUT/draw-trace.pftrace") >> "$TRACE_OUT/draw-trace-commands.log" 2>&1 && test -s "$TRACE_OUT/draw-trace.pftrace"; then
      printf 'pull=ok\n' >> "$TRACE_STATUS" || true
    else
      rm -f "$TRACE_OUT/draw-trace.pftrace" || true
      printf 'pull=failed_or_empty\n' >> "$TRACE_STATUS" || true
    fi
  fi
  timeout --signal=TERM --kill-after=5s 15s adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
  if test "$exit_status" -ne 0; then
    python3 "$ROOT/tools/android-native-diagnostic-excerpt.py" < "$OUT/logcat.txt" || true
  fi
  kill "$EMU_PID" 2>/dev/null || true
  if [[ "$GPU_CANARY" == 1 ]] &&
    ! timeout 10 bash -c 'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done' _ "$EMU_PID"; then
    printf 'Canary inconclusive: owned emulator did not exit\n' | tee "$OUT/emulator-still-running.txt" >&2
    exit 1
  fi
  return "$exit_status"
}
trap cleanup EXIT
timeout 180 adb wait-for-device
booted=0
phone_ready=0
printf '%s\n' 'native readiness phase=boot-and-phone budget=90-polls interval=2s'
for attempt in $(seq 1 90); do
  if test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1; then
    booted=1
    # svc data disable invokes cmd phone; the binder can register after boot_completed.
    phone_status="$(adb shell service check phone | tr -d '\r')"
    if test "$phone_status" = 'Service phone: found'; then
      phone_ready=1
      break
    fi
  fi
  kill -0 "$EMU_PID"
  sleep 2
done
if test "$booted" != 1; then
  printf '%s\n' 'native readiness phase=boot-completed failed within shared poll budget' >&2
  exit 1
fi
if test "$phone_ready" != 1; then
  printf '%s\n' 'native readiness phase=phone-service failed within shared poll budget' >&2
  exit 1
fi
printf '%s\n' 'native readiness phase=boot-and-phone ready'
if [[ "$GPU_CANARY" == 1 ]]; then
  selected_gpu="$(sed -nE 's/^.*gles_mode_selected:([^[:space:]]+).*$/\1/p' "$OUT/emulator.log" | sort -u)"
  {
    printf 'requested_gles=%s\nselected_gles=%s\n' "$GPU" "$selected_gpu"
    grep -E 'gles_mode_selected:|Graphics Adapter|Graphics API Version' "$OUT/emulator.log" || true
  } | tee "$OUT/graphics-backend.txt"
  case "$GPU/$selected_gpu" in
    swiftshader/swiftshader|swangle/swangle|swangle/swangle_indirect) ;;
    *) printf 'Canary inconclusive: requested GLES backend was not selected\n' >&2; exit 1 ;;
  esac
fi
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
test "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = 1
adb shell settings get global airplane_mode_on > "$OUT/airplane-mode.txt"
adb shell dumpsys webviewupdate > "$OUT/webview.txt"
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82
# Detached trace has a ten-minute hard deadline, a 32 MiB ring, and an explicit stop in cleanup.
# Failed instrumentation and failed tracing remain separate outcomes. See Perfetto detached mode.
if test -n "$TRACE_OUT"; then
TRACE_ATTEMPTED=1
{
  printf 'github_run_id=%s\ngithub_run_attempt=%s\n' "${GITHUB_RUN_ID:-unavailable}" "${GITHUB_RUN_ATTEMPT:-unavailable}"
  printf 'expected_debug_apk_sha256=%s\n' "$EXPECTED_APK_SHA256"
  printf 'source_sha='
  timeout --signal=TERM --kill-after=2s 5s git rev-parse HEAD 2>/dev/null || printf 'unavailable\n'
  printf 'duration_ms=600000\nbuffer_kib=32768\n'
  printf 'start_host_utc=%s\n' "$(date -u +%FT%TZ)"
  printf 'start_guest_uptime='
  (ulimit -f 1024; timeout --signal=TERM --kill-after=2s 5s adb shell cat /proc/uptime) || printf 'unavailable\n'
} > "$TRACE_STATUS" 2>/dev/null || true
if (ulimit -f 1024; timeout --signal=TERM --kill-after=2s 15s adb shell perfetto -c - --txt --detach=alibi-native -o "$TRACE_DEVICE") >> "$TRACE_OUT/draw-trace-commands.log" 2>&1 <<'TRACE_CONFIG'
duration_ms: 600000
write_into_file: true
file_write_period_ms: 1000000000
buffers: { size_kb: 32768 fill_policy: RING_BUFFER }
data_sources: { config { name: "linux.ftrace" ftrace_config {
  ftrace_events: "sched/sched_switch"
  ftrace_events: "sched/sched_waking"
  atrace_categories: "gfx"
  atrace_categories: "view"
  atrace_categories: "wm"
  atrace_categories: "ss"
  atrace_apps: "example.unapproved.alibi.preview"
} } }
data_sources: { config { name: "linux.process_stats" } }
TRACE_CONFIG
then
  printf 'start=ok\n' >> "$TRACE_STATUS" || true
else
  printf 'start=failed\n' >> "$TRACE_STATUS" || true
fi
{
  printf 'start_return_guest_uptime='
  (ulimit -f 1024; timeout --signal=TERM --kill-after=2s 5s adb shell cat /proc/uptime) || printf 'unavailable\n'
} >> "$TRACE_STATUS" 2>/dev/null || true
fi
# nativeHostBootsAndNavigatesOffline checks installed sourceDir before and after controls.
(cd android && ./gradlew --no-daemon --dependency-verification=strict \
  "-Pandroid.testInstrumentationRunnerArguments.alibiExpectedApkSha256=$EXPECTED_APK_SHA256" \
  :app:connectedDebugAndroidTest)
python tools/android-smoke-evidence.py record --expected-sha "$EXPECTED_APK_SHA256"
