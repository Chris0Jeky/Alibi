"""Exercise CI Ubuntu source configuration without touching system APT files."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/ci-ubuntu-sources.sh"
BASH = os.environ.get("ALIBI_TEST_BASH", "/bin/bash")
SOURCES = "/etc/apt/sources.list.d/ubuntu.sources"
KEYRING = "/usr/share/keyrings/ubuntu-archive-keyring.gpg"


class UbuntuSourceTests(unittest.TestCase):
    def run_setup(self, *, actions="true", failure=""):
        with tempfile.TemporaryDirectory(prefix="alibi-ubuntu-sources-") as directory:
            root = Path(directory)
            sudo = root / "sudo"
            sudo.write_text(
                """#!/bin/bash
printf '%s\\n' "$*" >> "$STUB_ROOT/calls"
if [[ "$*" == "$STUB_FAILURE" ]]; then
    exit 37
fi
case "$1" in
    test) ;;
    tee)
        shift
        targets=()
        for path in "$@"; do
            targets+=("$STUB_ROOT/${path##*/}")
        done
        tee "${targets[@]}"
        ;;
    *) exit 38 ;;
esac
""",
                newline="\n",
            )
            sudo.chmod(0o755)
            env = {
                **os.environ,
                "PATH": str(root) + os.pathsep + os.environ["PATH"],
                "GITHUB_ACTIONS": actions,
                "RUNNER_OS": "Linux",
                "STUB_ROOT": root.as_posix(),
                "STUB_FAILURE": failure,
            }
            result = subprocess.run(
                [BASH, SCRIPT.as_posix()], env=env, capture_output=True, text=True
            )
            files = {path.name: path.read_text() for path in root.iterdir() if path != sudo}
            return result, files

    def test_configures_native_and_nested_apt_with_signed_priority_mirrors(self):
        result, files = self.run_setup()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            files["alibi-ci-mirrors.txt"].splitlines(),
            [
                "https://mirrors.edge.kernel.org/ubuntu/\tpriority:1",
                "https://mirrors.nic.funet.fi/ubuntu/\tpriority:2",
            ],
        )
        self.assertEqual(files["apt-mirrors.txt"], files["alibi-ci-mirrors.txt"])
        self.assertEqual(
            files["ubuntu.sources"].splitlines(),
            [
                "Types: deb",
                "URIs: mirror+file:/etc/apt/alibi-ci-mirrors.txt",
                "Suites: noble noble-updates noble-backports noble-security",
                "Components: main restricted universe multiverse",
                f"Signed-By: {KEYRING}",
            ],
        )
        self.assertEqual(
            files["zzz-alibi-ci-sources"].splitlines(),
            [
                f'Dir::Etc::sourcelist "{SOURCES}";',
                'Dir::Etc::sourceparts "-";',
                'Acquire::Retries "0";',
                'Acquire::http::Timeout "15";',
                'Acquire::https::Timeout "15";',
                'APT::Update::Error-Mode "any";',
            ],
        )
        self.assertEqual(
            files["calls"].splitlines(),
            [
                f"test -s {SOURCES}",
                f"test -r {KEYRING}",
                "tee /etc/apt/alibi-ci-mirrors.txt /etc/apt/apt-mirrors.txt",
                f"tee {SOURCES}",
                "tee /etc/apt/apt.conf.d/zzz-alibi-ci-sources",
            ],
        )

    def test_refuses_to_configure_apt_outside_actions(self):
        result, files = self.run_setup(actions="")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(files, {})

    def test_missing_archive_keyring_prevents_writes(self):
        result, files = self.run_setup(failure=f"test -r {KEYRING}")
        self.assertEqual(result.returncode, 37)
        self.assertEqual(files, {"calls": f"test -s {SOURCES}\ntest -r {KEYRING}\n"})

    def test_failed_source_write_stops_setup(self):
        result, files = self.run_setup(failure=f"tee {SOURCES}")
        self.assertEqual(result.returncode, 37)
        self.assertNotIn("zzz-alibi-ci-sources", files)


if __name__ == "__main__":
    unittest.main()
