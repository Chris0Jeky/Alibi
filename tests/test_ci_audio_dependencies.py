"""Exercise the audio setup script with disposable command stubs, not system APT."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'tools/ci-audio-dependencies.sh'


class AudioSetupTests(unittest.TestCase):
    def run_setup(self, present=False, failure='', cached=False):
        tmp = tempfile.TemporaryDirectory(prefix='alibi-audio-')
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        bin_dir = root / 'bin'
        bin_dir.mkdir()
        cache = root / 'archives'
        cache.mkdir()
        if cached:
            (cache / 'ffmpeg_fixture.deb').write_text('cached archive')
        log = root / 'calls'
        sudo = bin_dir / 'sudo'
        sudo.write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$STUB_LOG"
if [[ "$*" == *"$STUB_FAILURE"* && -n "$STUB_FAILURE" ]]; then exit 37; fi
if [[ "$*" == *"install --yes --no-install-recommends ffmpeg"* ]]; then
  printf '#!/bin/bash\\nprintf "ffprobe stub\\\\n"\\n' > "$STUB_BIN/ffprobe"
  chmod +x "$STUB_BIN/ffprobe"
fi
''')
        sudo.chmod(0o755)
        if present:
            probe = bin_dir / 'ffprobe'
            probe.write_text('#!/bin/bash\nprintf "ffprobe stub\\n"\n')
            probe.chmod(0o755)
        # chmod is needed by the sudo stub, but the host ffprobe must not leak in.
        (bin_dir / 'chmod').symlink_to('/bin/chmod')
        env = {**os.environ, 'PATH': str(bin_dir), 'STUB_BIN': str(bin_dir),
               'STUB_LOG': str(log), 'STUB_FAILURE': failure}
        result = subprocess.run(['/bin/bash', str(SCRIPT), str(cache)], env=env,
                                text=True, capture_output=True)
        return result, log.read_text().splitlines() if log.exists() else [], cache

    def test_missing_probe_installs_using_archive_cache_and_checks_probe(self):
        result, calls, cache = self.run_setup()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls, ['apt-get update',
                         f'apt-get -o Dir::Cache::archives={cache}/ install --yes --no-install-recommends ffmpeg'])
        self.assertIn('ffprobe stub', result.stdout)

    def test_present_probe_does_not_install(self):
        result, calls, _ = self.run_setup(present=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls, [])
        self.assertIn('ffprobe stub', result.stdout)

    def test_existing_archive_survives_setup_and_is_offered_to_apt(self):
        result, calls, cache = self.run_setup(cached=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f'Dir::Cache::archives={cache}/', calls[1])
        self.assertEqual((cache / 'ffmpeg_fixture.deb').read_text(), 'cached archive')

    def test_install_failure_is_propagated_and_probe_is_not_accepted(self):
        result, calls, _ = self.run_setup(failure='install')
        self.assertEqual(result.returncode, 37)
        self.assertEqual(len(calls), 2)
        self.assertNotIn('ffprobe stub', result.stdout)

    def test_update_failure_prevents_install(self):
        result, calls, _ = self.run_setup(failure='update')
        self.assertEqual(result.returncode, 37)
        self.assertEqual(calls, ['apt-get update'])

    def test_workflow_restores_before_setup_and_saves_only_after_success(self):
        workflow = (ROOT / '.github/workflows/check.yml').read_text()
        restore = workflow.index('uses: actions/cache/restore@')
        setup = workflow.index('node tools/ci-setup-phase.cjs --phase audio-dependencies')
        save = workflow.index('uses: actions/cache/save@')
        self.assertLess(restore, setup)
        self.assertLess(setup, save)
        self.assertIn('--timeout-seconds 480 --grace-seconds 20 -- bash tools/ci-audio-dependencies.sh', workflow)
        self.assertIn('steps.audio-cache.outputs.cache-hit != \'true\' && steps.audio-cache-save.outputs.populated == \'true\'', workflow)
        self.assertIn('restore-keys: ${{ steps.audio-cache-key.outputs.prefix }}', workflow)
        self.assertIn('${ID}-${VERSION_ID}-${RUNNER_ARCH}-ffmpeg-v1-', workflow)
        self.assertIn('python tests/test_ci_audio_dependencies.py', workflow)


if __name__ == '__main__':
    unittest.main()
