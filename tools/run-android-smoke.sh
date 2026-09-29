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
printf 'no\n' | avdmanager create avd --force --name alibi_native \
  --package 'system-images;android-36;google_apis;x86_64' --device pixel_6
emulator -avd alibi_native -port 5554 -no-window -no-audio -no-boot-anim \
  -no-snapshot -gpu swiftshader -memory 2048 > "$OUT/emulator.log" 2>&1 &
EMU_PID=$!
cleanup() {
  adb logcat -d > "$OUT/logcat.txt" 2>&1 || true
  kill "$EMU_PID" 2>/dev/null || true
}
trap cleanup EXIT
timeout 180 adb wait-for-device
booted=0
for attempt in $(seq 1 90); do
  if test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1; then
    booted=1
    break
  fi
  kill -0 "$EMU_PID"
  sleep 2
done
test "$booted" = 1
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
  connectedDebugAndroidTest)
python tools/android-smoke-evidence.py record --expected-sha "$EXPECTED_APK_SHA256"
