"""Synthetic receipt tests, not Android execution or installed-APK evidence."""
from pathlib import Path
import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("smoke_evidence", ROOT / "tools/android-smoke-evidence.py")
POLICY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(POLICY)
CLASS = "example.unapproved.alibi.preview.NativeOfflineSmokeTest"
TEST = "nativeHostBootsAndNavigatesOffline"
SOURCE = "a" * 40


class SmokeEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.apk = self.root / "app-debug.apk"
        self.apk.write_bytes(b"synthetic APK fixture, not installable")
        self.digest = hashlib.sha256(self.apk.read_bytes()).hexdigest()
        self.receipt = self.root / "package.json"
        self.data = {"schemaVersion": 1, "evidence": "apk-static-audit", "sourceSha": SOURCE,
                     "applicationId": "example.unapproved.alibi.preview", "variant": "debug",
                     "productionApproved": False, "apkSha256": self.digest,
                     "apkBytes": self.apk.stat().st_size}
        self.receipt.write_text(json.dumps(self.data), encoding="utf-8")
        self.reports = self.root / "reports"
        self.reports.mkdir()
        self.xml = self.reports / "TEST-native.xml"
        self.xml.write_text(f'<testsuite tests="1" failures="0" errors="0" skipped="0">'
                            f'<testcase classname="{CLASS}" name="{TEST}"/></testsuite>')

    def prepare(self):
        return POLICY.prepare(self.apk, self.receipt, SOURCE)

    def record(self, expected=None):
        return POLICY.record(self.apk, self.receipt, self.reports, SOURCE, expected or self.digest)

    def test_exact_audited_apk_and_successful_named_test_produce_bound_receipt(self):
        self.assertEqual(self.prepare(), self.digest)
        receipt = self.record()
        self.assertEqual(receipt["apkSha256"], self.digest)
        self.assertEqual(receipt["sourceSha"], SOURCE)
        self.assertEqual(receipt["installedApkBinding"], "instrumentation-sourceDir-sha256-before-and-after")
        self.assertEqual(receipt["packageReceiptSha256"], hashlib.sha256(self.receipt.read_bytes()).hexdigest())
        self.assertFalse(receipt["physicalDeviceAccepted"])
        self.assertFalse(receipt["productionApproved"])

    def test_package_replacement_before_or_during_instrumentation_is_rejected(self):
        self.apk.write_bytes(b"different package")
        with self.assertRaises(ValueError):
            self.prepare()
        with self.assertRaises(ValueError):
            self.record()

    def test_rewriting_both_package_and_receipt_cannot_change_expected_digest(self):
        self.apk.write_bytes(b"different package")
        self.data.update(apkSha256=hashlib.sha256(self.apk.read_bytes()).hexdigest(),
                         apkBytes=self.apk.stat().st_size)
        self.receipt.write_text(json.dumps(self.data))
        self.assertNotEqual(self.prepare(), self.digest)
        with self.assertRaises(ValueError):
            self.record()

    def test_malformed_or_wrong_context_receipts_fail_closed(self):
        for key, value in [("sourceSha", "b" * 40), ("variant", "capacitorPreview"),
                           ("applicationId", "another.app"), ("evidence", "synthetic"),
                           ("schemaVersion", True), ("apkBytes", True),
                           ("apkBytes", 0), ("apkSha256", "invalid"),
                           ("productionApproved", True), ("productionApproved", 0)]:
            with self.subTest(key=key, value=value):
                data = copy.deepcopy(self.data)
                data[key] = value
                self.receipt.write_text(json.dumps(data))
                with self.assertRaises(ValueError):
                    self.prepare()
        for text in ["{}", "null", "[]", "{", " " * 65537]:
            self.receipt.write_text(text)
            with self.assertRaises(ValueError):
                self.prepare()

    def test_missing_fields_fail_closed(self):
        for key in self.data:
            data = dict(self.data)
            del data[key]
            self.receipt.write_text(json.dumps(data))
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.prepare()

    def test_no_reports_wrong_class_duplicate_or_skipped_test_cannot_pass(self):
        variants = ["<testsuite/>",
                    f'<testsuite><testcase classname="wrong" name="{TEST}"/></testsuite>',
                    f'<testsuite><testcase classname="{CLASS}" name="{TEST}"><skipped/></testcase></testsuite>',
                    f'<testsuite><testcase classname="{CLASS}" name="{TEST}"><failure/></testcase></testsuite>',
                    f'<testsuite failures="1"><testcase classname="{CLASS}" name="{TEST}"/></testsuite>',
                    f'<testsuite errors="1"><testcase classname="{CLASS}" name="{TEST}"/></testsuite>',
                    f'<testsuite skipped="1"><testcase classname="{CLASS}" name="{TEST}"/></testsuite>',
                    f'<testsuite><testcase classname="{CLASS}" name="{TEST}"/>'
                    f'<testcase classname="{CLASS}" name="{TEST}"/></testsuite>']
        for xml in variants:
            self.xml.write_text(xml)
            with self.subTest(xml=xml), self.assertRaises(ValueError):
                self.record()
        self.xml.unlink()
        with self.assertRaises(ValueError):
            self.record()

    def test_malformed_expected_digest_or_source_is_rejected(self):
        for expected in ["", "../file", "1" * 63, "A" * 64]:
            with self.subTest(expected=expected), self.assertRaises(ValueError):
                POLICY.record(self.apk, self.receipt, self.reports, SOURCE, expected)
        with self.assertRaises(ValueError):
            POLICY.prepare(self.apk, self.receipt, "not-a-source-sha")


if __name__ == "__main__":
    unittest.main()
