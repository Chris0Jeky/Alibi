"""Synthetic ZIP/manifest unit tests, not installed-device or compiled-APK evidence."""
import importlib.util
import base64
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import warnings
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("android_package", ROOT / "tools/check-android-package.py")
PACKAGE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKAGE)
APP_ID = "example.unapproved.alibi.preview"
SHA = "a" * 40
PROFILE_FIXTURE = json.loads((ROOT / "tests/fixtures/native-apk-profiles/reviewed-preview.json").read_text())
PROFILE_BYTES = {item["path"]: base64.b64decode(item["base64"], validate=True)
                 for item in PROFILE_FIXTURE["profiles"]}
MANIFEST = f'''<manifest xmlns:android="http://schemas.android.com/apk/res/android"
package="{APP_ID}" android:versionCode="1" android:versionName="0.15.0">
<uses-sdk android:minSdkVersion="24" android:targetSdkVersion="36"/>
<uses-permission android:name="android.permission.INTERNET"/>
<application android:allowBackup="false" android:usesCleartextTraffic="false" android:debuggable="false"
android:fullBackupContent="@xml/backup_rules_legacy" android:dataExtractionRules="@xml/backup_rules_extraction">
<activity android:name="{APP_ID}.MainActivity" android:exported="true" android:launchMode="singleTask">
<intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
</activity>
<provider android:name="androidx.core.content.FileProvider" android:authorities="{APP_ID}.fileprovider"
android:exported="false" android:grantUriPermissions="true"/>
</application></manifest>'''


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="alibi-native-package-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.assets = self.root / "assets"
        (self.assets / "public").mkdir(parents=True)
        (self.assets / "public/index.html").write_text("native preview", encoding="utf-8")
        identity = {"sourceSha": SHA, "sourceDirty": False, "flavor": "capacitor-preview"}
        (self.assets / "public/android-build-identity.json").write_text(json.dumps(identity), encoding="utf-8")
        (self.assets / "capacitor.config.json").write_text("{}", encoding="utf-8")
        (self.assets / "capacitor.plugins.json").write_text("[]", encoding="utf-8")
        self.bridge = self.root / "native-bridge.js"
        self.bridge.write_text("// pinned native bridge\n", encoding="utf-8")
        self.apk = self.root / "sample.apk"
        self.manifest = MANIFEST
        self.repack()

    def repack(self, changes=None, omit=(), variant="capacitorPreview"):
        data = {"assets/" + p.relative_to(self.assets).as_posix(): p.read_bytes()
                for p in self.assets.rglob("*") if p.is_file()}
        data["assets/native-bridge.js"] = self.bridge.read_bytes()
        data["AndroidManifest.xml"] = b"synthetic binary manifest placeholder"
        data["classes.dex"] = b"synthetic dex placeholder"
        if variant == "capacitorPreview":
            data.update(PROFILE_BYTES)
        data.update(changes or {})
        with zipfile.ZipFile(self.apk, "w") as z:
            for name, contents in data.items():
                if name not in omit:
                    z.writestr(name, contents)

    def inspect(self, variant="capacitorPreview"):
        calls = []
        def decode(apk):
            calls.append(apk)
            return self.manifest
        result = PACKAGE.inspect_package(self.apk, self.assets, self.bridge,
                                         "0.15.0", SHA, variant, decode=decode)
        self.assertEqual(calls, [self.apk], "decode the same APK that is inventoried")
        return result

    def test_valid_preview_receipt_is_bound_to_source_and_package(self):
        receipt = self.inspect()
        self.assertEqual(receipt["sourceSha"], SHA)
        self.assertEqual(receipt["evidence"], "apk-static-audit")
        self.assertFalse(receipt["productionApproved"])
        self.assertFalse(receipt["debuggable"])
        self.assertEqual(receipt["nativeLibraries"], [])
        for field in ("apkSha256", "manifestSha256", "bridgeSha256"):
            self.assertRegex(receipt[field], r"^[0-9a-f]{64}$")

    def test_exact_reviewed_preview_profiles_are_accepted_and_reported(self):
        self.repack(PROFILE_BYTES)
        try:
            receipt = self.inspect()
        except ValueError as error:
            self.fail(f"The exact reviewed preview profile pair must pass: {error}")
        self.assertEqual(receipt["baselineProfiles"], [
            {key: item[key] for key in ("path", "bytes", "sha256")}
            for item in PROFILE_FIXTURE["profiles"]
        ])
        self.assertEqual(receipt["sourceSha"], SHA)
        self.assertFalse(receipt["productionApproved"])

    def test_preview_requires_both_reviewed_profiles(self):
        paths = tuple(PROFILE_BYTES)
        for omitted in (paths, paths[:1], paths[1:]):
            with self.subTest(omitted=omitted):
                self.repack(PROFILE_BYTES, omit=omitted)
                with self.assertRaisesRegex(ValueError, "asset"):
                    self.inspect()

    def test_synced_assets_cannot_establish_profile_trust(self):
        for name, payload in PROFILE_BYTES.items():
            target = self.assets / name.removeprefix("assets/")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
        for variant in ("debug", "capacitorPreview"):
            with self.subTest(variant=variant):
                self.repack(variant=variant)
                with self.assertRaisesRegex(ValueError, "profile"):
                    self.inspect(variant)

    def test_profile_fixture_bytes_match_the_independent_source_pins(self):
        self.assertEqual(set(PROFILE_BYTES), {"assets/dexopt/baseline.prof", "assets/dexopt/baseline.profm"})
        for name, payload in PROFILE_BYTES.items():
            self.assertEqual((len(payload), hashlib.sha256(payload).hexdigest()), PACKAGE.PREVIEW_PROFILES[name])

    def test_preview_rejects_tampered_truncated_oversized_or_swapped_profile_bytes(self):
        for name, payload in PROFILE_BYTES.items():
            other = next(value for path, value in PROFILE_BYTES.items() if path != name)
            for changed in (payload[:-1], payload + b'\0', payload[:-1] + bytes([payload[-1] ^ 1]), other):
                with self.subTest(name=name, bytes=len(changed)):
                    self.repack({**PROFILE_BYTES, name: changed})
                    with self.assertRaisesRegex(ValueError, "profile"):
                        self.inspect()

    def test_unknown_profile_paths_are_not_allowed(self):
        for name in ("assets/dexopt/other.prof", "assets/dexopt/nested/baseline.prof", "assets/dexopt/BASELINE.prof"):
            with self.subTest(name=name):
                self.repack({**PROFILE_BYTES, name: b"unreviewed"})
                with self.assertRaisesRegex(ValueError, "asset"):
                    self.inspect()

    def test_duplicate_or_symlink_profile_entries_are_rejected(self):
        for name, payload in PROFILE_BYTES.items():
            with self.subTest(name=name, kind="duplicate"):
                self.repack(PROFILE_BYTES)
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", UserWarning)
                    with zipfile.ZipFile(self.apk, "a") as archive:
                        archive.writestr(name, payload)
                with self.assertRaisesRegex(ValueError, "duplicate"):
                    self.inspect()
            with self.subTest(name=name, kind="symlink"):
                self.repack(PROFILE_BYTES, omit=(name,))
                entry = zipfile.ZipInfo(name)
                entry.create_system = 3
                entry.external_attr = 0o120777 << 16
                with zipfile.ZipFile(self.apk, "a") as archive:
                    archive.writestr(entry, "target")
                with self.assertRaisesRegex(ValueError, "symlink"):
                    self.inspect()

    def test_reviewed_profiles_are_rejected_for_debug(self):
        self.manifest = MANIFEST.replace('debuggable="false"', 'debuggable="true"')
        for assets in (PROFILE_BYTES, {name: payload for name, payload in list(PROFILE_BYTES.items())[:1]}):
            with self.subTest(paths=list(assets)):
                self.repack(assets, variant="debug")
                with self.assertRaisesRegex(ValueError, "asset"):
                    self.inspect("debug")

    def test_debug_and_preview_debuggable_flags_are_not_interchangeable(self):
        self.repack(variant="debug")
        with self.assertRaisesRegex(ValueError, "debuggable"):
            self.inspect("debug")
        self.manifest = MANIFEST.replace('debuggable="false"', 'debuggable="true"')
        self.assertTrue(self.inspect("debug")["debuggable"])
        self.assertEqual(self.inspect("debug")["baselineProfiles"], [])
        self.repack()
        with self.assertRaisesRegex(ValueError, "debuggable"):
            self.inspect()

    def test_disabled_application_or_launcher_cannot_produce_a_package_receipt(self):
        for variant in ("debug", "capacitorPreview"):
            self.repack(variant=variant)
            for disabled in ("application", "activity", "both"):
                with self.subTest(variant=variant, disabled=disabled):
                    root = ET.fromstring(MANIFEST)
                    app = root.find("application")
                    app.set(PACKAGE.ANDROID + "debuggable", str(variant == "debug").lower())
                    if disabled in ("application", "both"):
                        app.set(PACKAGE.ANDROID + "enabled", "false")
                    if disabled in ("activity", "both"):
                        app.find("activity").set(PACKAGE.ANDROID + "enabled", "false")
                    self.manifest = ET.tostring(root, encoding="unicode")
                    with self.assertRaisesRegex(ValueError, "enabled"):
                        self.inspect(variant)

    def test_missing_extra_tampered_and_native_library_entries_fail(self):
        cases = [({"assets/public/index.html": b"tampered"}, (), "asset"),
                 ({"assets/native-bridge.js": b"tampered"}, (), "asset"),
                 ({"assets/unreviewed.js": b"remote code"}, (), "asset"),
                 ({}, ("assets/public/index.html",), "asset"),
                 ({}, ("assets/native-bridge.js",), "asset"),
                 ({"lib/arm64-v8a/example.so": b"ELF"}, (), "native librar")]
        for changes, omit, reason in cases:
            with self.subTest(changes=changes, omit=omit):
                self.repack(changes, omit)
                with self.assertRaisesRegex(ValueError, reason):
                    self.inspect()

    def test_unsafe_duplicate_and_symlink_archive_entries_fail(self):
        for name in ("../escape", "/absolute", "assets//empty", "assets/./dot", "assets\\alias"):
            with self.subTest(name=name):
                self.repack({name: b"bad"})
                with self.assertRaisesRegex(ValueError, "path"):
                    self.inspect()
        self.repack()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.apk, "a") as z:
                z.writestr("assets/public/index.html", "duplicate")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.inspect()
        self.repack()
        info = zipfile.ZipInfo("assets/link")
        info.create_system = 3
        info.external_attr = 0o120777 << 16
        with zipfile.ZipFile(self.apk, "a") as z:
            z.writestr(info, "target")
        with self.assertRaisesRegex(ValueError, "symlink"):
            self.inspect()

    def test_stale_dirty_or_wrong_flavor_payload_identity_fails(self):
        path = self.assets / "public/android-build-identity.json"
        for key, value in (("sourceSha", "b" * 40), ("sourceDirty", True),
                           ("flavor", "browser-preview")):
            with self.subTest(key=key):
                identity = {"sourceSha": SHA, "sourceDirty": False, "flavor": "capacitor-preview", key: value}
                path.write_text(json.dumps(identity), encoding="utf-8")
                self.repack()
                with self.assertRaisesRegex(ValueError, "identity"):
                    self.inspect()

    def test_manifest_policy_rejects_identity_sdk_backup_cleartext_and_export_changes(self):
        for old, new in ((APP_ID, "com.example.production"), ('versionName="0.15.0"', 'versionName="0.14.0"'),
                         ('minSdkVersion="24"', 'minSdkVersion="23"'),
                         ('targetSdkVersion="36"', 'targetSdkVersion="35"'),
                         ('allowBackup="false"', 'allowBackup="true"'),
                         ('usesCleartextTraffic="false"', 'usesCleartextTraffic="true"'),
                         ('launchMode="singleTask"', 'launchMode="standard"')):
            with self.subTest(old=old):
                self.manifest = MANIFEST.replace(old, new)
                with self.assertRaises(ValueError):
                    self.inspect()
        for injected in ('<uses-permission android:name="android.permission.CAMERA"/>',
                         '<uses-permission-sdk-23 android:name="android.permission.READ_EXTERNAL_STORAGE"/>'):
            self.manifest = MANIFEST.replace("<application ", injected + "<application ")
            with self.assertRaisesRegex(ValueError, "permission"):
                self.inspect()
        self.manifest = MANIFEST.replace("</application>", '<service android:name="evil.Service" android:exported="true"/></application>')
        with self.assertRaisesRegex(ValueError, "export"):
            self.inspect()

    def test_only_signature_restricted_androidx_receiver_is_allowed(self):
        receiver = '<receiver android:name="androidx.profileinstaller.ProfileInstallReceiver" android:exported="true" android:permission="android.permission.DUMP"/>'
        self.manifest = MANIFEST.replace("</application>", receiver + "</application>")
        self.inspect()
        self.manifest = self.manifest.replace('android:permission="android.permission.DUMP"', '')
        with self.assertRaisesRegex(ValueError, "export"):
            self.inspect()

    def test_malformed_or_entity_manifest_and_absent_source_assets_fail(self):
        for text in ("not XML", '<!DOCTYPE manifest [<!ENTITY x "value">]><manifest/>'):
            self.manifest = text
            with self.assertRaises(ValueError):
                self.inspect()
        self.manifest = MANIFEST
        (self.assets / "public/index.html").unlink()
        self.repack()
        with self.assertRaisesRegex(ValueError, "required|index"):
            self.inspect()

    def test_invalid_variant_and_missing_apk_do_not_produce_a_receipt(self):
        with self.assertRaises(ValueError):
            self.inspect("release")
        self.apk.unlink()
        with self.assertRaises((ValueError, FileNotFoundError)):
            self.inspect()


if __name__ == "__main__":
    unittest.main()
