"""Execute the exact Android-test hashing helper on the JVM; not an Android test."""
from pathlib import Path
import hashlib
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "example.unapproved.alibi.preview"
SOURCE = ROOT / "android/app/src/androidTest/java/example/unapproved/alibi/preview/ApkIdentity.java"


class ApkIdentityTest(unittest.TestCase):
    def test_actual_helper_accepts_only_the_expected_complete_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            runner = root / "IdentityTestRunner.java"
            runner.write_text('''package example.unapproved.alibi.preview;
import java.io.File;
public class IdentityTestRunner {
    public static void main(String[] args) throws Exception {
        ApkIdentity.verify(new File(args[0]), args[1]);
    }
}
''')
            subprocess.run(["javac", "-d", str(root), str(SOURCE), str(runner)], check=True,
                           capture_output=True, text=True)
            apk = root / "package.bin"
            content = bytes(range(256)) * 200
            apk.write_bytes(content)
            expected = hashlib.sha256(content).hexdigest()

            def run(digest):
                return subprocess.run(["java", "-cp", str(root), PACKAGE + ".IdentityTestRunner",
                                       str(apk), digest], capture_output=True, text=True)

            self.assertEqual(run(expected).returncode, 0)
            for invalid in ["", "0" * 64, "../file", expected.upper(), expected[:-1]]:
                with self.subTest(invalid=invalid):
                    self.assertNotEqual(run(invalid).returncode, 0)
            apk.write_bytes(content[:-1])
            self.assertNotEqual(run(expected).returncode, 0)
            apk.unlink()
            self.assertNotEqual(run(expected).returncode, 0)


if __name__ == "__main__":
    unittest.main()
