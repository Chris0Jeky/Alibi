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
    elif args == ['shell', 'getprop', 'sys.boot_completed']: print('1\r')
    elif args == ['shell', 'settings', 'get', 'global', 'airplane_mode_on']: print('1')
    elif args == ['logcat', '-d']: print('stub logcat retained')
elif name == 'gradlew':
    assert '-Pandroid.testInstrumentationRunnerArguments.alibiExpectedApkSha256=' + 'a' * 64 in args
    assert '--dependency-verification=strict' in args
    assert 'connectedDebugAndroidTest' in args
    sys.exit(int(os.environ.get('STUB_GRADLE_EXIT', '0')))
else: raise AssertionError(name)
'''


class SmokeRunnerTests(unittest.TestCase):
    def run_smoke(self, **overrides):
        temp = tempfile.TemporaryDirectory(prefix='alibi-smoke-runner-')
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        self.addCleanup(self.stop_stub, root)
        project = root / 'project'
        (project / 'tools').mkdir(parents=True)
        (project / 'android').mkdir()
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
                           'then return 0; fi; builtin test "$@"; }\n')
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
        result = subprocess.run(['bash', str(project / 'tools/run-android-smoke.sh')], env=env,
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


if __name__ == '__main__':
    unittest.main()
