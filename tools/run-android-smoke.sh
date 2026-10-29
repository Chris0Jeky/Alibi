#!/usr/bin/env bash
# Fresh CI AVD only. No physical devices, signing keys or user saves are used.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/test-results/native"
mkdir -p "$OUT"
# Keep the original audited digest across Gradle's potentially rebuilding install step.
EXPECTED_APK_SHA256="$(python tools/android-smoke-evidence.py prepare)"
# A failed or skipped run must not reuse an earlier success receipt/report.
rm -f "$OUT/emulator-smoke.json"
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
  -no-snapshot -gpu swiftshader -memory 2048 > "$OUT/emulator.log" 2>&1 &
EMU_PID=$!
cleanup() {
  local exit_status=$?
  timeout --signal=TERM --kill-after=5s 15s adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
  if test "$exit_status" -ne 0; then
    python3 "$ROOT/tools/android-native-diagnostic-excerpt.py" < "$OUT/logcat.txt" || true
  fi
  kill "$EMU_PID" 2>/dev/null || true
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
# nativeHostBootsAndNavigatesOffline checks installed sourceDir before and after controls.
(cd android && ./gradlew --no-daemon --dependency-verification=strict \
  "-Pandroid.testInstrumentationRunnerArguments.alibiExpectedApkSha256=$EXPECTED_APK_SHA256" \
  :app:connectedDebugAndroidTest)
python tools/android-smoke-evidence.py record --expected-sha "$EXPECTED_APK_SHA256"
