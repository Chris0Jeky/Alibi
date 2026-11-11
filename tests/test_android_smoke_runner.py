"""Execute the actual smoke shell with disposable command stubs, never an SDK.

These tests prove runner admission/handoff, not installed Android acceptance.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
STUB = r'''#!/usr/bin/env python3
import json, os, signal, sys, time
from pathlib import Path
name = Path(sys.argv[0]).name
args = sys.argv[1:]
root = Path(os.environ['STUB_ROOT'])
with (root / 'calls.jsonl').open('a') as stream:
    stream.write(json.dumps({'name': name, 'args': args,
        'avdHome': os.environ.get('ANDROID_AVD_HOME')}) + '\n')
if name == 'python':
    assert args[0] == 'tools/android-smoke-evidence.py'
    if args[1] == 'prepare': print('a' * 64)
    else:
        assert args == [args[0], 'record', '--expected-sha', 'a' * 64]
        (root / 'recorded').touch()
elif name == 'sudo':
    assert args == ['chmod', 'a+rw', '/dev/kvm']
elif name == 'avdmanager':
    assert args[:2] == ['create', 'avd']
    assert args[args.index('--name') + 1] == 'alibi_native'
    home = Path(os.environ.get('ANDROID_AVD_HOME') or (os.environ['ANDROID_USER_HOME'] + '/avd'))
    home.mkdir(parents=True, exist_ok=True)
    if not os.environ.get('STUB_MISSING_INI'):
        data = Path(args[args.index('--path') + 1]) if '--path' in args else home / 'alibi_native.avd'
        data.mkdir(parents=True, exist_ok=True)
        (home / 'alibi_native.ini').write_text('path=' + str(data) + '\n')
elif name == 'emulator':
    home = Path(os.environ.get('ANDROID_AVD_HOME') or (os.environ['ANDROID_EMULATOR_HOME'] + '/avd'))
    present = (home / 'alibi_native.ini').is_file()
    if args == ['-list-avds']:
        if present and not os.environ.get('STUB_UNLISTED'): print('alibi_native')
    else:
        assert args[:2] == ['-avd', 'alibi_native']
        if not present: sys.exit(53)
        selected = os.environ.get('STUB_SELECTED_GPU', args[args.index('-gpu') + 1])
        print('INFO | emuglConfig_init: vulkan_mode_selected:swiftshader gles_mode_selected:' + selected, flush=True)
        (root / 'emulator.pid').write_text(str(os.getpid()))
        def stop(*_):
            (root / 'emulator-stopped').touch()
            sys.exit(0)
        signal.signal(signal.SIGTERM, stop)
        while True: time.sleep(1)
elif name == 'adb':
    assert os.environ['ANDROID_SERIAL'] == 'emulator-5554'
    if args == ['wait-for-device']:
        for _ in range(100):
            if (root / 'emulator.pid').exists(): break
            time.sleep(0.01)
        else: sys.exit(54)
    elif args == ['shell', 'getprop', 'sys.boot_completed']:
        countfile = root / 'boot-check-count'
        count = int(countfile.read_text()) + 1 if countfile.exists() else 1
        countfile.write_text(str(count))
        print(('1' if count > int(os.environ.get('STUB_BOOT_DELAY', '0')) else '0') + '\r')
    elif args == ['shell', 'service', 'check', 'phone']:
        if os.environ.get('STUB_PHONE_CHECK_FAIL'): sys.exit(37)
        countfile = root / 'phone-check-count'
        count = int(countfile.read_text()) + 1 if countfile.exists() else 1
        countfile.write_text(str(count))
        ready = count > int(os.environ.get('STUB_PHONE_DELAY', '0'))
        print('Service phone: ' + ('found' if ready else 'not found') + '\r')
    elif args == ['shell', 'svc', 'wifi', 'disable'] and os.environ.get('STUB_WIFI_FAIL'):
        sys.exit(31)
    elif args == ['shell', 'settings', 'get', 'global', 'airplane_mode_on']: print('1')
    elif args[:3] == ['shell', 'perfetto', '-c']:
        (root / 'trace-config').write_text(sys.stdin.read())
        if os.environ.get('STUB_TRACE_START_HANG'): time.sleep(3)
        if os.environ.get('STUB_TRACE_START_FAIL'): sys.exit(42)
        (root / 'trace-started').touch()
    elif args[:3] == ['shell', 'perfetto', '--attach=alibi-native']:
        if os.environ.get('STUB_TRACE_STOP_HANG'): time.sleep(3)
        if os.environ.get('STUB_TRACE_STOP_FAIL') or not (root / 'trace-started').exists(): sys.exit(43)
        (root / 'trace-stopped').touch()
    elif args[:2] == ['pull', '/data/misc/perfetto-traces/alibi-native.pftrace']:
        if os.environ.get('STUB_TRACE_PULL_HANG'): time.sleep(3)
        if os.environ.get('STUB_TRACE_PULL_FAIL') or not (root / 'trace-started').exists(): sys.exit(44)
        Path(args[2]).write_bytes(b'fake trace')
    elif args == ['shell', 'cat', '/proc/uptime']: print('123.45 100.00')
    elif args == ['logcat', '-d']: print('stub logcat retained')
elif name == 'gradlew':
    assert '-Pandroid.testInstrumentationRunnerArguments.alibiExpectedApkSha256=' + 'a' * 64 in args
    assert '--dependency-verification=strict' in args
    android_test_tasks = [arg for arg in args if 'connectedDebugAndroidTest' in arg]
    assert android_test_tasks == [':app:connectedDebugAndroidTest']
    sys.exit(int(os.environ.get('STUB_GRADLE_EXIT', '0')))
else: raise AssertionError(name)
'''


class SmokeRunnerTests(unittest.TestCase):
    def run_smoke(self, *arguments, **overrides):
        temp = tempfile.TemporaryDirectory(prefix='alibi-smoke-runner-')
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        self.addCleanup(self.stop_stub, root)
        project = root / 'project'
        (project / 'tools').mkdir(parents=True)
        (project / 'android').mkdir()
        if overrides.get('STUB_TRACE_SETUP_FAIL') or overrides.get('STUB_TRACE_SEED_STALE'):
            stale = project / 'test-results/native/draw-trace.stale'
            stale.mkdir(parents=True)
            (stale / 'draw-trace.pftrace').write_bytes(b'old trace')
        shutil.copyfile(ROOT / 'tools/run-android-smoke.sh', project / 'tools/run-android-smoke.sh')
        sdk = root / 'sdk'
        bin_dir = root / 'bin'
        for directory in (bin_dir, sdk / 'platform-tools', sdk / 'emulator', sdk / 'cmdline-tools/latest/bin'):
            directory.mkdir(parents=True)
        for command, directory in [('python', bin_dir), ('sudo', bin_dir),
                                   ('adb', sdk / 'platform-tools'), ('emulator', sdk / 'emulator'),
                                   ('avdmanager', sdk / 'cmdline-tools/latest/bin'),
                                   ('gradlew', project / 'android')]:
            target = directory / command
            target.write_text(STUB)
            target.chmod(0o755)
        preload = root / 'preload.sh'
        # The only unavailable host facility is KVM. Keep all other shell tests real.
        preload.write_text('test() { if [[ "$#" == 2 && "$1" == -e && "$2" == /dev/kvm ]]; '
                           'then return 0; fi; builtin test "$@"; }\n'
                           'seq() { if [[ -n "${STUB_SHORT_BOOT:-}" && "$*" == "1 90" ]]; '
                           'then printf "1\\n2\\n3\\n"; else command seq "$@"; fi; }\n'
                           'sleep() { if [[ -n "${STUB_SHORT_BOOT:-}" ]]; then :; '
                           'else command sleep "$@"; fi; }\n'
                           'mktemp() { if [[ -n "${STUB_TRACE_SETUP_FAIL:-}" && "$*" == *"draw-trace."* ]]; '
                           'then if [[ "$STUB_TRACE_SETUP_FAIL" == notdir ]]; then '
                           'local bad="${2%XXXXXX}bad"; : > "$bad"; printf "%s\\n" "$bad"; '
                           'else return 1; fi; else command mktemp "$@"; fi; }\n'
                           'timeout() { if [[ -n "${STUB_TRACE_SETUP_FAIL:-}" && "$*" == *"mktemp -d"*"draw-trace."* ]]; '
                           'then mktemp "${@:5}"; '
                           'elif [[ -n "${STUB_FAST_TIMEOUT:-}" && ( "$*" == *"adb shell perfetto"* || "$*" == *"adb pull"* ) ]]; '
                           'then command timeout --signal=TERM --kill-after=0.2s 0.2s "${@:4}"; '
                           'else command timeout "$@"; fi; }\n')
        runner_temp = root / 'runner-temp'
        runner_temp.mkdir()
        inherited = [root / name for name in ('user-prefs', 'emulator-prefs', 'legacy-prefs')]
        for directory in inherited:
            directory.mkdir()
            (directory / 'untouched').write_text('keep')
        env = {**os.environ, 'PATH': str(bin_dir) + os.pathsep + os.environ['PATH'],
               'ANDROID_HOME': str(sdk), 'ANDROID_AVD_HOME': '',
               'ANDROID_USER_HOME': str(inherited[0]), 'ANDROID_EMULATOR_HOME': str(inherited[1]),
               'ANDROID_SDK_HOME': str(inherited[2]), 'RUNNER_TEMP': str(runner_temp),
               'BASH_ENV': str(preload), 'STUB_ROOT': str(root), **overrides}
        started = time.monotonic()
        result = subprocess.run(['bash', str(project / 'tools/run-android-smoke.sh'), *arguments], env=env,
                                capture_output=True, text=True, timeout=8)
        elapsed = time.monotonic() - started
        calls = [json.loads(line) for line in (root / 'calls.jsonl').read_text().splitlines()]
        return root, project, runner_temp, inherited, result, elapsed, calls

    @staticmethod
    def stop_stub(root):
        pid_file = root / 'emulator.pid'
        if pid_file.exists():
            try: os.kill(int(pid_file.read_text()), 9)
            except ProcessLookupError: pass

    def assert_stopped(self, root):
        for _ in range(100):
            if (root / 'emulator-stopped').exists(): return
            time.sleep(0.01)
        self.fail('The runner did not terminate its owned emulator stub')

    def test_mismatched_inherited_homes_use_one_owned_avd_and_complete_handoff(self):
        root, project, runner_temp, inherited, result, _, calls = self.run_smoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        created = next(c for c in calls if c['name'] == 'avdmanager')
        home = Path(created['avdHome'])
        self.assertEqual(home.parent, runner_temp)
        self.assertTrue(home.name.startswith('alibi-native-avd.'))
        self.assertTrue((home / 'alibi_native.ini').is_file())
        self.assertEqual(Path(created['args'][created['args'].index('--path') + 1]), home / 'alibi_native.avd')
        for call in calls:
            if call['name'] in ('avdmanager', 'emulator'):
                self.assertEqual(call['avdHome'], str(home))
        for directory in inherited:
            self.assertEqual(list(directory.iterdir()), [directory / 'untouched'])
        self.assertEqual((project / 'test-results/native/avds.txt').read_text().strip(), 'alibi_native')
        self.assertTrue((root / 'recorded').exists())
        self.assertTrue(any(c['name'] == 'adb' and c['args'] == ['shell', 'cmd', 'connectivity', 'airplane-mode', 'enable'] for c in calls))
        self.assertTrue(any(c['name'] == 'adb' and c['args'] == ['shell', 'svc', 'wifi', 'disable'] for c in calls))
        self.assertTrue(any(c['name'] == 'adb' and c['args'] == ['shell', 'svc', 'data', 'disable'] for c in calls))
        self.assertEqual((project / 'test-results/native/logcat.txt').read_text(), 'stub logcat retained\n')
        self.assert_stopped(root)

    def test_gpu_canary_requires_the_selected_backend_before_using_frozen_apks(self):
        for selected, status in [('swangle_indirect', 0), ('swiftshader', 1)]:
            with self.subTest(selected=selected):
                root, project, _, _, result, _, calls = self.run_smoke(
                    '--gpu-canary=swangle', STUB_SELECTED_GPU=selected)
                self.assertEqual(result.returncode, status, result.stderr)
                arm = project / 'test-results/native/gpu-canary/swangle'
                self.assertIn('selected_gles=' + selected, (arm / 'graphics-backend.txt').read_text())
                self.assertTrue((arm / 'logcat.txt').exists())
                gradle = [call['args'] for call in calls if call['name'] == 'gradlew']
                if status == 0:
                    self.assertEqual(gradle[0][-4:], ['-x', ':app:packageDebug',
                                                     '-x', ':app:packageDebugAndroidTest'])
                    self.assertTrue((root / 'recorded').exists())
                else:
                    self.assertEqual(gradle, [])
                    self.assertIn('Canary inconclusive', result.stderr)
                self.assert_stopped(root)

    def test_missing_created_ini_fails_before_launch_or_instrumentation(self):
        self.assert_missing(STUB_MISSING_INI='1')

    def test_created_but_undiscoverable_avd_fails_before_launch_or_instrumentation(self):
        self.assert_missing(STUB_UNLISTED='1')

    def assert_missing(self, **mode):
        root, _, _, _, result, elapsed, calls = self.run_smoke(**mode)
        self.assertNotEqual(result.returncode, 0)
        self.assertLess(elapsed, 5)
        self.assertFalse((root / 'emulator.pid').exists())
        self.assertFalse((root / 'recorded').exists())
        self.assertFalse(any(c['name'] in ('adb', 'gradlew') for c in calls))
        self.assertFalse(any(c['name'] == 'emulator' and c['args'] != ['-list-avds'] for c in calls))

    def test_instrumentation_failure_keeps_status_and_runs_existing_cleanup(self):
        root, project, _, _, result, _, _ = self.run_smoke(STUB_GRADLE_EXIT='23')
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertFalse((root / 'recorded').exists())
        self.assertEqual((project / 'test-results/native/logcat.txt').read_text(), 'stub logcat retained\n')
        self.assert_stopped(root)

    def test_unavailable_trace_setup_preserves_smoke_result_and_does_not_claim_stale_output(self):
        for setup in ('mktemp', 'notdir'):
            for status in ('0', '23'):
                with self.subTest(setup=setup, status=status):
                    root, project, _, _, result, _, calls = self.run_smoke(
                        STUB_TRACE_SETUP_FAIL=setup, STUB_GRADLE_EXIT=status)
                    self.assertEqual(result.returncode, int(status), result.stderr)
                    self.assertEqual((root / 'recorded').exists(), status == '0')
                    self.assertIn('native trace output=unavailable', result.stdout)
                    self.assertFalse(any(c['args'][:2] == ['shell', 'perfetto'] for c in calls))
                    self.assertEqual((project / 'test-results/native/draw-trace.stale/draw-trace.pftrace').read_bytes(), b'old trace')
                    self.assertNotIn('native trace output=draw-trace.stale', result.stdout)
                    self.assert_stopped(root)

    def test_fresh_trace_identity_excludes_existing_stale_capture(self):
        root, project, _, _, result, _, _ = self.run_smoke(STUB_TRACE_SEED_STALE='1')
        self.assertEqual(result.returncode, 0, result.stderr)
        trace_line = next(line for line in result.stdout.splitlines() if line.startswith('native trace output='))
        trace_name = trace_line.split('=', 1)[1]
        self.assertNotEqual(trace_name, 'draw-trace.stale')
        out = project / 'test-results/native'
        self.assertEqual((out / trace_name / 'draw-trace.pftrace').read_bytes(), b'fake trace')
        self.assertEqual((out / 'draw-trace.stale/draw-trace.pftrace').read_bytes(), b'old trace')
        self.assert_stopped(root)

    def test_trace_spans_instrumentation_and_is_retained_on_failure(self):
        root, project, _, _, result, _, calls = self.run_smoke(STUB_GRADLE_EXIT='23')
        self.assertEqual(result.returncode, 23, result.stderr)
        self.assertTrue(any(c['args'][:3] == ['shell', 'perfetto', '-c'] for c in calls), 'trace starts')
        start = next(i for i, c in enumerate(calls) if c['args'][:3] == ['shell', 'perfetto', '-c'])
        gradle = next(i for i, c in enumerate(calls) if c['name'] == 'gradlew')
        stop = next(i for i, c in enumerate(calls) if c['args'][:3] == ['shell', 'perfetto', '--attach=alibi-native'])
        self.assertLess(start, gradle)
        self.assertLess(gradle, stop)
        self.assertTrue((root / 'trace-started').exists())
        self.assertTrue((root / 'trace-stopped').exists())
        out = next((project / 'test-results/native').glob('draw-trace.*'))
        self.assertEqual((out / 'draw-trace.pftrace').read_bytes(), b'fake trace')
        self.assertIn('pull=ok', (out / 'draw-trace-status.txt').read_text())

    def test_trace_failure_does_not_mask_smoke_result(self):
        for failure in ('STUB_TRACE_START_FAIL', 'STUB_TRACE_STOP_FAIL', 'STUB_TRACE_PULL_FAIL'):
            for status in ('0', '23'):
                with self.subTest(failure=failure, status=status):
                    root, project, _, _, result, _, _ = self.run_smoke(**{failure: '1', 'STUB_GRADLE_EXIT': status})
                    self.assertEqual(result.returncode, int(status), result.stderr)
                    self.assertEqual((root / 'recorded').exists(), status == '0')
                    trace_status = next((project / 'test-results/native').glob('draw-trace.*/draw-trace-status.txt'))
                    self.assertTrue(trace_status.exists(), 'diagnostic status is retained')
                    self.assertIn('failed', trace_status.read_text())
                    if failure == 'STUB_TRACE_STOP_FAIL':
                        self.assertEqual((trace_status.parent / 'draw-trace.pftrace').read_bytes(), b'fake trace')
                    self.assert_stopped(root)

    def test_hung_trace_commands_are_bounded_and_preserve_instrumentation_failure(self):
        for failure in ('STUB_TRACE_START_HANG', 'STUB_TRACE_STOP_HANG', 'STUB_TRACE_PULL_HANG'):
            with self.subTest(failure=failure):
                root, project, _, _, result, elapsed, _ = self.run_smoke(
                    **{failure: '1', 'STUB_FAST_TIMEOUT': '1', 'STUB_GRADLE_EXIT': '23'})
                self.assertEqual(result.returncode, 23, result.stderr)
                self.assertLess(elapsed, 5)
                trace_status = next((project / 'test-results/native').glob('draw-trace.*/draw-trace-status.txt'))
                self.assertIn('failed', trace_status.read_text())
                self.assert_stopped(root)

    def test_phone_appears_after_boot_before_any_network_command(self):
        root, _, _, _, result, _, calls = self.run_smoke(STUB_SHORT_BOOT='1', STUB_PHONE_DELAY='2')
        self.assertEqual(result.returncode, 0, result.stderr)
        checks = [i for i, c in enumerate(calls) if c['args'] == ['shell', 'service', 'check', 'phone']]
        self.assertEqual(len(checks), 3)
        disable = next(i for i, c in enumerate(calls) if c['args'] == ['shell', 'svc', 'data', 'disable'])
        airplane = next(i for i, c in enumerate(calls) if c['args'] == ['shell', 'cmd', 'connectivity', 'airplane-mode', 'enable'])
        self.assertLess(checks[-1], airplane)
        self.assertLess(airplane, disable)
        self.assertTrue((root / 'recorded').exists())
        self.assert_stopped(root)

    def test_phone_never_ready_fails_before_network_or_instrumentation(self):
        root, _, _, _, result, _, calls = self.run_smoke(STUB_SHORT_BOOT='1', STUB_PHONE_DELAY='99')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('phone', result.stderr.lower())
        self.assertEqual(sum(c['args'] == ['shell', 'service', 'check', 'phone'] for c in calls), 3)
        self.assertFalse(any(c['name'] == 'gradlew' or c['args'][:3] == ['shell', 'svc', 'data'] or
                             c['args'][:3] == ['shell', 'cmd', 'connectivity'] for c in calls))
        self.assertFalse((root / 'recorded').exists())
        self.assert_stopped(root)

    def test_unrelated_wifi_failure_propagates_before_instrumentation(self):
        root, _, _, _, result, _, calls = self.run_smoke(STUB_SHORT_BOOT='1', STUB_WIFI_FAIL='1')
        self.assertEqual(result.returncode, 31)
        self.assertFalse(any(c['name'] == 'gradlew' or c['args'] == ['shell', 'svc', 'data', 'disable'] for c in calls))
        self.assertFalse((root / 'recorded').exists())
        self.assert_stopped(root)

    def test_phone_wait_uses_remaining_boot_poll_budget(self):
        root, _, _, _, result, _, calls = self.run_smoke(
            STUB_SHORT_BOOT='1', STUB_BOOT_DELAY='2', STUB_PHONE_DELAY='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('phone-service', result.stderr)
        self.assertEqual(sum(c['args'] == ['shell', 'getprop', 'sys.boot_completed'] for c in calls), 3)
        self.assertEqual(sum(c['args'] == ['shell', 'service', 'check', 'phone'] for c in calls), 1)
        self.assertFalse(any(c['name'] == 'gradlew' for c in calls))
        self.assert_stopped(root)

    def test_phone_query_failure_preserves_status(self):
        root, _, _, _, result, _, calls = self.run_smoke(STUB_SHORT_BOOT='1', STUB_PHONE_CHECK_FAIL='1')
        self.assertEqual(result.returncode, 37)
        self.assertFalse(any(c['name'] == 'gradlew' or c['args'] == ['shell', 'svc', 'data', 'disable'] for c in calls))
        self.assert_stopped(root)


if __name__ == '__main__':
    unittest.main()
