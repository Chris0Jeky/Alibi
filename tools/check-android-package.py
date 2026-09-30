#!/usr/bin/env python3
"""Inspect the actual APK's manifest and asset closure. Never authorizes a release."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

APP_ID = "example.unapproved.alibi.preview"
ANDROID = "{http://schemas.android.com/apk/res/android}"
VARIANTS = {"debug": True, "capacitorPreview": False}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_hash(filename: Path) -> str:
    with filename.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def regular_file(filename: Path) -> bytes:
    require(not filename.is_symlink() and filename.is_file(), f"Expected regular file: {filename}")
    return filename.read_bytes()


def asset_inventory(directory: Path) -> dict[str, bytes]:
    require(not directory.is_symlink() and directory.is_dir(), "Expected regular assets directory")
    result = {}
    for filename in directory.rglob("*"):
        require(not filename.is_symlink(), f"Unexpected asset symlink: {filename}")
        if filename.is_dir():
            continue
        require(len(result) < 10000, "Asset inventory exceeds 10000 files")
        result["assets/" + filename.relative_to(directory).as_posix()] = regular_file(filename)
    for name in ("public/index.html", "public/android-build-identity.json",
                 "capacitor.config.json", "capacitor.plugins.json"):
        require("assets/" + name in result, f"Missing required asset: {name}")
    return result


def decode_manifest(apk: Path) -> str:
    # Passing the APK directly avoids auditing an unrelated source/merged XML file.
    result = subprocess.run(["apkanalyzer", "manifest", "print", str(apk)],
                            check=True, capture_output=True, text=True, timeout=90)
    return result.stdout


def manifest_policy(text: str, version: str, variant: str) -> dict:
    require(isinstance(text, str) and len(text.encode("utf-8")) <= 1048576,
            "Decoded manifest exceeds inspection limit")
    require("<!DOCTYPE" not in text.upper() and "<!ENTITY" not in text.upper(),
            "Manifest entities and document types are not allowed")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as error:
        raise ValueError(f"Malformed decoded manifest: {error}") from error
    require(root.tag == "manifest" and root.get("package") == APP_ID, "Unexpected package identity")
    require(root.get(ANDROID + "versionCode") == "1", "Unexpected preview version code")
    require(root.get(ANDROID + "versionName") == version, "Unexpected application version")
    sdks = root.findall("uses-sdk")
    require(len(sdks) == 1 and sdks[0].get(ANDROID + "minSdkVersion") == "24"
            and sdks[0].get(ANDROID + "targetSdkVersion") == "36", "Unexpected SDK contract")
    apps = root.findall("application")
    require(len(apps) == 1, "Expected one application")
    app = apps[0]
    require(app.get(ANDROID + "allowBackup") == "false", "Automatic backup must remain disabled")
    require(app.get(ANDROID + "fullBackupContent") is not None
            and app.get(ANDROID + "dataExtractionRules") is not None,
            "Both legacy and modern backup rules must remain declared")
    require(app.get(ANDROID + "usesCleartextTraffic") == "false", "Cleartext must be explicitly disabled")
    require(app.get(ANDROID + "networkSecurityConfig") is None, "Unexpected network security override")
    debugging = app.get(ANDROID + "debuggable", "false")
    require(debugging in ("true", "false") and (debugging == "true") == VARIANTS[variant],
            f"Unexpected debuggable flag for {variant}")
    permissions = sorted({node.get(ANDROID + "name", "") for node in root
                          if node.tag in ("uses-permission", "uses-permission-sdk-23")})
    internal = APP_ID + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
    require("android.permission.INTERNET" in permissions
            and set(permissions) <= {"android.permission.INTERNET", internal},
            f"Unexpected permission set: {permissions}")
    for permission in root.findall("permission"):
        require(permission.get(ANDROID + "name") == internal
                and permission.get(ANDROID + "protectionLevel") in ("signature", "2", "0x2", "0x00000002"),
                "Unexpected declared permission or signature protection")
    exported = []
    main = []
    providers = []
    for component in app:
        if component.tag not in ("activity", "activity-alias", "service", "receiver", "provider"):
            continue
        name = component.get(ANDROID + "name", "")
        if name.startswith("."):
            name = APP_ID + name
        elif "." not in name:
            name = APP_ID + "." + name
        visible = component.get(ANDROID + "exported", "true" if component.findall("intent-filter") else "false")
        require(visible in ("true", "false"), "Unexpected exported flag")
        if component.tag == "activity" and name == APP_ID + ".MainActivity":
            main.append(component)
        if name == "androidx.core.content.FileProvider":
            providers.append(component)
            require(component.tag == "provider" and visible == "false"
                    and component.get(ANDROID + "authorities") == APP_ID + ".fileprovider"
                    and component.get(ANDROID + "grantUriPermissions") == "true",
                    "Unexpected FileProvider exposure")
        if visible == "true":
            allowed = (component.tag == "activity" and name == APP_ID + ".MainActivity") or (
                component.tag == "receiver" and name == "androidx.profileinstaller.ProfileInstallReceiver"
                and component.get(ANDROID + "permission") == "android.permission.DUMP")
            require(allowed, f"Unexpected exported component: {name}")
            exported.append(name)
    require(len(main) == 1 and main[0].get(ANDROID + "exported") == "true"
            and main[0].get(ANDROID + "launchMode") == "singleTask", "Unexpected launcher contract")
    filters = main[0].findall("intent-filter")
    require(len(filters) == 1 and not filters[0].findall("data")
            and [n.get(ANDROID + "name") for n in filters[0].findall("action")] == ["android.intent.action.MAIN"]
            and [n.get(ANDROID + "name") for n in filters[0].findall("category")] == ["android.intent.category.LAUNCHER"],
            "Unexpected launcher or deep-link exposure")
    require(len(providers) == 1, "Expected one unexported FileProvider")
    return {"debuggable": debugging == "true", "permissions": permissions, "exportedComponents": sorted(exported)}


def inspect_package(apk: Path, assets: Path, bridge: Path, version: str, source_sha: str,
                    variant: str, *, decode=decode_manifest) -> dict:
    require(variant in VARIANTS, "Only debug and capacitorPreview variants may be audited")
    require(re.fullmatch(r"[0-9a-f]{40}", source_sha) is not None, "Expected full source SHA")
    require(not apk.is_symlink() and apk.is_file(), "Expected regular APK file")
    require(apk.stat().st_size <= 512 * 1024 * 1024, "APK exceeds inspection safety limit")
    before = file_hash(apk)
    expected = asset_inventory(assets)
    expected["assets/native-bridge.js"] = regular_file(bridge)
    identity = json.loads(expected["assets/public/android-build-identity.json"])
    require(isinstance(identity, dict) and identity.get("sourceSha") == source_sha
            and identity.get("sourceDirty") is False and identity.get("flavor") == "capacitor-preview",
            "Packaged source identity must match a clean native-flavor checkout")
    with zipfile.ZipFile(apk) as archive:
        entries = archive.infolist()
        require(len(entries) <= 20000, "APK exceeds entry inspection limit")
        require(sum(e.file_size for e in entries) <= 512 * 1024 * 1024, "Expanded APK exceeds inspection limit")
        names = set()
        for entry in entries:
            name = entry.filename.rstrip("/")
            require(name and not name.startswith("/") and "\\" not in name
                    and "\x00" not in entry.orig_filename
                    and not any(part in ("", ".", "..") for part in name.split("/")),
                    f"Unsafe archive path: {entry.filename}")
            require(entry.filename not in names, f"Unexpected duplicate entry: {entry.filename}")
            require(not stat.S_ISLNK(entry.external_attr >> 16), f"Unexpected symlink entry: {name}")
            require(not (entry.flag_bits & 1), "Encrypted APK entries are not supported")
            names.add(entry.filename)
        libraries = sorted(name for name in names if name.lower().endswith(".so"))
        require(not libraries, f"Unreviewed native libraries: {libraries}")
        actual_assets = {e.filename for e in entries if not e.is_dir() and e.filename.startswith("assets/")}
        require(actual_assets == set(expected), "APK asset set differs from checked sync plus pinned native bridge")
        for name, contents in expected.items():
            require(archive.read(name) == contents, f"APK asset differs: {name}")
    manifest = decode(apk)
    policy = manifest_policy(manifest, version, variant)
    require(file_hash(apk) == before, "APK changed during inspection")
    return {"schemaVersion": 1, "evidence": "apk-static-audit", "productionApproved": False,
            "sourceSha": source_sha, "applicationId": APP_ID, "appVersion": version, "variant": variant,
            "apkSha256": before, "apkBytes": apk.stat().st_size,
            "manifestSha256": sha256(manifest.encode("utf-8")),
            "bridgeSha256": sha256(expected["assets/native-bridge.js"]),
            "assets": len(expected), "nativeLibraries": libraries, **policy}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--variant", choices=VARIANTS, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        # The pure unit-test API accepts synthetic manifests; this CLI never does.
        subprocess.run(["node", "tools/sync-android.cjs", "--check"], cwd=root, check=True)
        source_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
        dirty = subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True)
        require(not dirty, "Package inspection requires a clean source checkout")
        version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
        receipt = inspect_package(args.apk.resolve(), root / "android/app/src/main/assets",
                                  root / "node_modules/@capacitor/android/capacitor/src/main/assets/native-bridge.js",
                                  version, source_sha, args.variant)
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(receipt))
        return 0
    except (OSError, ValueError, zipfile.BadZipFile, subprocess.SubprocessError) as error:
        print(f"Android package check failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
