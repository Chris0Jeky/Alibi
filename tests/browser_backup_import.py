"""Cabinet restore control proof with a document picker advertised before bootstrap.

This uses a fresh real-origin Chromium context and injected File System Access API
fixtures. It leaves the no-picker fallback coverage in browser_origin.py intact.
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8793/")
PAYLOAD = json.dumps(
    {
        "format": "alibi-backup",
        "schemaVersion": 1,
        "runs": [],
        "packs": [],
        "settings": {},
        "preferences": {"seen": [], "favorites": []},
    }
)
checks: list[str] = []


def check(value: object, label: str) -> None:
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


def wait_toast(page, text: str) -> None:
    page.locator("#toasts").get_by_text(text, exact=True).wait_for()


def route_settings(page) -> None:
    page.evaluate("() => { location.hash = '#/settings'; }")
    page.locator('[data-action="import-backup"]').wait_for()


def import_dialog(page) -> None:
    page.locator('[data-action="import-backup"]').click()
    page.locator('[data-action="restore-merge"]').wait_for(timeout=10000)


def fresh_profile() -> Path:
    return Path(tempfile.mkdtemp(prefix="alibi-backup-picker-"))


with sync_playwright() as playwright:
    launch = {"headless": True, "args": ["--no-sandbox"]}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    elif Path("/usr/bin/chromium").exists():
        launch["executable_path"] = "/usr/bin/chromium"
    profile = fresh_profile()
    try:
        context = playwright.chromium.launch_persistent_context(
            str(profile),
            **launch,
            viewport={"width": 390, "height": 900},
            accept_downloads=True,
            service_workers="allow",
        )
        page = context.new_page()
        page.set_default_timeout(10000)
        page.add_init_script(
            """
            (() => {
              const fixture = globalThis.__cabinetPicker = {
                mode: 'normal', payload: '', openCalls: 0, saveCalls: 0,
                readCalls: 0, hiddenClicks: 0, resolve: null
              };
              const selected = () => ({
                size: fixture.mode === 'oversize' ? 16 * 1024 * 1024 + 1 : fixture.payload.length,
                async text() { fixture.readCalls++; return fixture.payload; }
              });
              Object.defineProperty(globalThis, 'showOpenFilePicker', {
                configurable: true,
                value: async () => {
                  fixture.openCalls++;
                  if (fixture.mode === 'cancel') throw new DOMException('cancelled', 'AbortError');
                  if (fixture.mode === 'deny') throw new DOMException('denied', 'NotAllowedError');
                  if (fixture.mode === 'pending') return await new Promise(resolve => { fixture.resolve = resolve; });
                  return [{ getFile: async () => selected() }];
                }
              });
              Object.defineProperty(globalThis, 'showSaveFilePicker', {
                configurable: true,
                value: async () => { fixture.saveCalls++; throw new Error('save picker must not run'); }
              });
            })();
            """
        )
        page.goto(BASE, wait_until="domcontentloaded")
        page.wait_for_function("() => Boolean(window.AlibiDiagnostics)")
        page.evaluate("(payload) => { window.__cabinetPicker.payload = payload; }", PAYLOAD)
        page.evaluate(
            """
            () => {
              const input = document.querySelector('#backup-input');
              const original = input.click.bind(input);
              input.click = () => { window.__cabinetPicker.hiddenClicks++; original(); };
            }
            """
        )
        check(
            page.evaluate(
                "() => AlibiPlatform.capabilities().userDocuments && typeof showSaveFilePicker === 'function'"
            ),
            "document picker capability is advertised from the pre-bootstrap APIs",
        )
        route_settings(page)

        before = page.evaluate("() => AlibiDiagnostics.getCounts()")
        page.evaluate("() => { window.__cabinetPicker.mode = 'cancel'; }")
        page.locator('[data-action="import-backup"]').click()
        wait_toast(page, "No backup was selected. Nothing was changed.")
        check(
            page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.readCalls === 0"),
            "picker cancellation does not fall back to the hidden input or read a document",
        )
        check(page.evaluate("(before) => JSON.stringify(AlibiDiagnostics.getCounts()) === JSON.stringify(before)", before), "picker cancellation leaves cabinet counts unchanged")

        page.evaluate("() => { window.__cabinetPicker.mode = 'deny'; }")
        page.locator('[data-action="import-backup"]').click()
        wait_toast(page, "The backup picker could not finish. Try again or use the file chooser.")
        check(page.evaluate("() => __cabinetPicker.hiddenClicks === 0"), "picker denial does not open the hidden input")

        page.evaluate("() => { window.__cabinetPicker.mode = 'oversize'; }")
        page.locator('[data-action="import-backup"]').click()
        wait_toast(page, "That backup is larger than 16 MB. Choose a smaller backup.")
        check(
            page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.readCalls === 0"),
            "oversize document is rejected by the bounded read before text access",
        )

        page.evaluate("() => { window.__cabinetPicker.mode = 'pending'; window.__cabinetPicker.resolve = null; }")
        first = page.locator('[data-action="import-backup"]')
        first.click()
        first.click()
        page.wait_for_function("() => __cabinetPicker.openCalls === 4")
        check(page.evaluate("() => __cabinetPicker.openCalls === 4"), "repeat clicks keep one picker request in flight")
        page.evaluate(
            """() => {
              __cabinetPicker.mode = 'normal';
              __cabinetPicker.resolve([{ getFile: async () => ({ size: __cabinetPicker.payload.length, text: async () => { __cabinetPicker.readCalls++; return __cabinetPicker.payload; } }) }]);
            }"""
        )
        page.locator('[data-action="restore-merge"]').wait_for(timeout=10000)
        check(page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.saveCalls === 0"), "successful picker path never invokes save or hidden-input APIs")
        page.locator('[data-action="close-dialog"]').first.click()

        page.evaluate("() => { window.__cabinetPicker.mode = 'normal'; }")
        import_dialog(page)
        page.locator('[data-action="restore-merge"]').click()
        page.wait_for_timeout(500)
        route_settings(page)
        page.evaluate("(payload) => { window.__cabinetPicker.payload = payload; }", PAYLOAD)
        with page.expect_download() as download:
            page.locator('[data-action="recovery"]').click()
        recovery = json.loads(Path(download.value.path()).read_text(encoding="utf-8"))
        check(recovery["format"] == "alibi-backup" and recovery["schemaVersion"] == 1, "successful Add missing restore retains a pre-restore recovery backup")

        import_dialog(page)
        page.locator('[data-action="restore-replace"]').click()
        page.locator('[data-action="restore-replace-confirm"]').click(force=True)
        page.wait_for_function("() => Boolean(window.AlibiDiagnostics)")
        route_settings(page)
        with page.expect_download() as download:
            page.locator('[data-action="recovery"]').click()
        recovery = json.loads(Path(download.value.path()).read_text(encoding="utf-8"))
        check(recovery["format"] == "alibi-backup", "successful Replace restore retains the existing recovery path")
        check(page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.saveCalls === 0"), "all advertised picker outcomes avoid browser fallback and save APIs")
        context.close()
    finally:
        shutil.rmtree(profile, ignore_errors=True)

print("PASS", len(checks), "browser backup-picker checks")
(ROOT / "test-results" / "browser-backup-import.json").write_text(
    json.dumps({"passed": True, "assertions": len(checks), "checks": checks, "scope": "Real-origin Chromium controls with pre-bootstrap document picker fixtures; no physical device or hosted deployment claim."}, indent=2),
    encoding="utf-8",
)
