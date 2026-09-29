#!/usr/bin/env bash
# Fresh CI AVD only. No physical devices, signing keys or user saves are used.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/test-results/native"
mkdir -p "$OUT"
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
(cd android && ./gradlew --no-daemon --dependency-verification=strict connectedDebugAndroidTest)
python - <<'PY'
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET
root = Path('android/app/build/outputs/androidTest-results/connected')
reports = list(root.rglob('TEST-*.xml'))
assert reports, 'No actual instrumentation reports were produced'
found = []
for report in reports:
    suite = ET.parse(report).getroot()
    for case in suite.iter('testcase'):
        assert not any(case.find(kind) is not None for kind in ('failure', 'error', 'skipped')), str(report)
        if case.get('name') == 'nativeHostBootsAndNavigatesOffline':
            found.append(case)
assert len(found) == 1, 'Expected exactly one successful native cold-boot smoke, not a skipped task'
receipt = {'schemaVersion': 1, 'evidence': 'debug-android-emulator-smoke',
           'sourceSha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
           'api': 36, 'variant': 'debug', 'airplaneMode': True,
           'test': 'nativeHostBootsAndNavigatesOffline', 'physicalDeviceAccepted': False,
           'productionApproved': False}
Path('test-results/native/emulator-smoke.json').write_text(json.dumps(receipt, indent=2) + '\n')
PY
