#!/usr/bin/env python3
"""Bind CI's audited debug APK to a successful installed-package instrumentation test."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET

APP_ID = "example.unapproved.alibi.preview"
TEST_CLASS = APP_ID + ".NativeOfflineSmokeTest"
TEST_NAME = "nativeHostBootsAndNavigatesOffline"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest_file(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def prepare(apk, package_receipt, source_sha):
    """Return the audited digest to pass to the on-device test, never derive new trust."""
    require(isinstance(source_sha, str) and re.fullmatch(r"[0-9a-f]{40}", source_sha), "Invalid source SHA")
    require(package_receipt.stat().st_size <= 65536, "Oversized package receipt")
    data = json.loads(package_receipt.read_text(encoding="utf-8"))
    require(isinstance(data, dict), "Expected a package receipt object")
    require(type(data.get("schemaVersion")) is int and data["schemaVersion"] == 1, "Wrong schema")
    for key, expected in {"evidence": "apk-static-audit", "sourceSha": source_sha,
                          "applicationId": APP_ID, "variant": "debug"}.items():
        require(data.get(key) == expected, f"Wrong package context: {key}")
    require(data.get("productionApproved") is False, "Preview must not claim production approval")
    digest = data.get("apkSha256")
    require(isinstance(digest, str) and re.fullmatch(r"[0-9a-f]{64}", digest), "Invalid audited APK digest")
    require(type(data.get("apkBytes")) is int and data["apkBytes"] > 0, "Invalid APK byte count")
    require(apk.stat().st_size == data["apkBytes"] and digest_file(apk) == digest,
            "APK differs from the statically audited package")
    return digest


def record(apk, package_receipt, reports_root, source_sha, expected_sha):
    require(isinstance(expected_sha, str) and re.fullmatch(r"[0-9a-f]{64}", expected_sha),
            "Invalid original expected digest")
    require(prepare(apk, package_receipt, source_sha) == expected_sha,
            "APK or audit receipt changed after preparing instrumentation")
    reports = sorted(reports_root.rglob("TEST-*.xml"))
    require(bool(reports), "No actual instrumentation reports were produced")
    found = 0
    for report in reports:
        suite = ET.parse(report).getroot()
        for node in suite.iter():
            if node.tag in ("testsuite", "testsuites"):
                for attribute in ("failures", "errors", "skipped", "disabled"):
                    require(int(node.get(attribute, "0")) == 0, f"Unsuccessful instrumentation suite: {report}")
            if node.tag == "testcase":
                require(not any(node.find(kind) is not None for kind in ("failure", "error", "skipped")),
                        f"Unsuccessful instrumentation test: {report}")
                if node.get("name") == TEST_NAME and node.get("classname") == TEST_CLASS:
                    found += 1
    require(found == 1, "Expected exactly one successful installed-package binding and cold-boot test")
    return {"schemaVersion": 2, "evidence": "debug-android-emulator-smoke", "sourceSha": source_sha,
            "applicationId": APP_ID, "variant": "debug", "api": 36, "airplaneMode": True,
            "apkSha256": expected_sha, "apkBytes": apk.stat().st_size,
            "packageReceiptSha256": digest_file(package_receipt),
            "installedApkBinding": "instrumentation-sourceDir-sha256-before-and-after",
            "test": TEST_NAME, "physicalDeviceAccepted": False, "productionApproved": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("prepare", "record"))
    parser.add_argument("--expected-sha")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    apk = root / "android/app/build/outputs/apk/debug/app-debug.apk"
    package_receipt = root / "test-results/native/debug-package.json"
    if args.phase == "prepare":
        print(prepare(apk, package_receipt, source_sha))
    else:
        receipt = record(apk, package_receipt,
                         root / "android/app/build/outputs/androidTest-results/connected",
                         source_sha, args.expected_sha)
        output = root / "test-results/native/emulator-smoke.json"
        output.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(receipt))


if __name__ == "__main__":
    main()
