"""Real-origin Cabinet picker proof with nonempty saved progress.

The incoming backup is created through actual Sudoku controls in one isolated browser
context. A second isolated context has a different saved Sudoku run, then exercises the
advertised document picker, staged Add missing and Replace restore paths. Failure paths
must leave IndexedDB unchanged. This does not claim hosted or physical-device coverage.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/")
ORIGIN = BASE.rstrip("/")
REPORT_PATH = ROOT / "test-results" / "browser-backup-import.json"
PICKER_SCRIPT = r"""
(() => {
  const fixture = globalThis.__cabinetPicker = {
    mode: 'normal', payload: '', openCalls: 0, saveCalls: 0,
    readCalls: 0, hiddenClicks: 0, resolve: null
  };
  const inputClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.id === 'backup-input') fixture.hiddenClicks++;
    return inputClick.call(this);
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
      if (fixture.mode === 'invalid') return [{}];
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

checks: list[str] = []
errors: list[str] = []
identity: dict[str, object] | None = None


def check(value: object, label: str) -> None:
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


def boot(page) -> None:
    page.wait_for_function("() => Boolean(window.AlibiDiagnostics)")
    page.wait_for_function("() => AlibiDiagnostics.getStatus().mode === 'indexeddb'")


def dismiss_lesson(page) -> None:
    dialog = page.locator("dialog[open]")
    if not dialog.count():
        return
    finish = dialog.locator('[data-action="lesson-finish"]')
    if finish.count():
        finish.click()
    else:
        close = dialog.locator('[data-action="close-dialog"]')
        if close.count():
            close.click()
    page.wait_for_function("() => !document.querySelector('dialog[open]')")


def route(page, fragment: str) -> None:
    target = fragment if fragment.startswith("#") else f"#{fragment}"
    page.goto(f"{ORIGIN}/{target}", wait_until="domcontentloaded")
    boot(page)


def move_sudoku(page) -> dict[str, object]:
    current = page.evaluate("() => AlibiDiagnostics.getCurrent()")
    puzzle = current["puzzle"]
    state = current["state"]
    index = next(
        i for i, given in enumerate(puzzle["givens"])
        if not given and state["cells"][i] == 0
    )
    value = puzzle["solution"][index]
    page.locator(f'[data-action="cell"][data-cell="{index}"]').click()
    page.locator(f'[data-action="value"][data-value="{value}"]').click()
    page.wait_for_function(
        "({key, value}) => AlibiDiagnostics.getCurrent()?.key === key && "
        "AlibiDiagnostics.getCurrent()?.state.cells.some((cell, i) => i === value.index && cell === value.answer)",
        arg={"key": current["key"], "value": {"index": index, "answer": value}},
    )
    page.wait_for_function("() => AlibiDiagnostics.getStatus().pendingSaves === 0")
    return page.evaluate("() => AlibiDiagnostics.getCurrent()")


def read_runs(page) -> list[dict[str, object]]:
    return page.evaluate(
        """() => new Promise((resolve, reject) => {
          const request = indexedDB.open('alibi-device');
          request.onerror = () => reject(request.error || new Error('run read failed'));
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('runs', 'readonly');
            const get = tx.objectStore('runs').getAll();
            get.onsuccess = () => { db.close(); resolve(get.result.map((record) => record.value)); };
            get.onerror = () => { db.close(); reject(get.error || new Error('run read failed')); };
          };
        })"""
    )


def stable_runs(page) -> str:
    return json.dumps(read_runs(page), sort_keys=True, separators=(",", ":"))


def wait_picker_dialog(page) -> None:
    page.locator('[data-action="restore-merge"]').wait_for(timeout=10000)


def start_picker(page) -> None:
    page.locator('[data-action="import-backup"]').click()


def wait_reload(page, old_origin: float) -> None:
    page.wait_for_function("(origin) => performance.timeOrigin !== origin", arg=old_origin)
    page.wait_for_function("() => Boolean(window.AlibiDiagnostics)")
    page.wait_for_function("() => AlibiDiagnostics.getStatus().mode === 'indexeddb'")


def export_backup(page) -> dict[str, object]:
    route(page, "#/settings")
    with page.expect_download() as download:
        page.locator('[data-action="export"]').first.click()
    return json.loads(Path(download.value.path()).read_text(encoding="utf-8"))


def run() -> dict[str, object]:
    global identity
    with sync_playwright() as playwright:
        launch = {"headless": True, "args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch["executable_path"] = os.environ["CHROMIUM_PATH"]
        elif Path("/usr/bin/chromium").exists():
            launch["executable_path"] = "/usr/bin/chromium"
        browser = playwright.chromium.launch(**launch)
        incoming_context = None
        test_context = None
        try:
            incoming_context = browser.new_context(viewport={"width": 390, "height": 900}, accept_downloads=True)
            incoming_page = incoming_context.new_page()
            incoming_page.set_default_timeout(10000)
            incoming_page.on("pageerror", lambda error: errors.append(f"incoming: {error}"))
            route(incoming_page, "#/play/sudoku-01@1")
            dismiss_lesson(incoming_page)
            incoming = move_sudoku(incoming_page)
            incoming_key = incoming["key"]
            incoming_payload = export_backup(incoming_page)
            incoming_records = {record["key"]: record for record in incoming_payload["runs"]}
            check(
                incoming_key in incoming_records and incoming_records[incoming_key]["moves"] > 0,
                "incoming backup is nonempty and was exported after an actual Sudoku control move",
            )
            incoming_context.close()
            incoming_context = None

            test_context = browser.new_context(
                viewport={"width": 390, "height": 900},
                accept_downloads=True,
            )
            test_context.add_init_script(PICKER_SCRIPT)
            page = test_context.new_page()
            page.set_default_timeout(10000)
            page.on("pageerror", lambda error: errors.append(f"restore: {error}"))
            route(page, "#/play/sudoku-02@1")
            dismiss_lesson(page)
            existing = move_sudoku(page)
            existing_key = existing["key"]
            check(existing_key != incoming_key and existing["moves"] > 0, "test context has a different existing Sudoku save")
            page.evaluate("(payload) => { __cabinetPicker.payload = payload; }", json.dumps(incoming_payload))
            identity = page.evaluate(
                "() => ({ config: globalThis.ALIBI_CONFIG, platform: globalThis.AlibiPlatform?.build })"
            )
            check(
                page.evaluate(
                    "() => AlibiPlatform.capabilities().userDocuments && typeof showSaveFilePicker === 'function'"
                ),
                "document picker capability is advertised from pre-bootstrap APIs",
            )
            route(page, "#/settings")
            before_failures = stable_runs(page)

            for mode, label, toast in [
                ("cancel", "picker cancellation", "No backup was selected. Nothing was changed."),
                ("deny", "picker denial", "The backup picker could not finish. Try again from Restore backup."),
                ("invalid", "invalid picker result", "The backup picker could not finish. Try again from Restore backup."),
            ]:
                page.evaluate("(mode) => { __cabinetPicker.mode = mode; }", mode)
                start_picker(page)
                page.locator("#toasts").get_by_text(toast, exact=True).wait_for()
                check(stable_runs(page) == before_failures, f"{label} leaves saved data unchanged")
                check(page.evaluate("() => __cabinetPicker.hiddenClicks === 0"), f"{label} never opens the hidden input")

            page.evaluate("() => { __cabinetPicker.mode = 'oversize'; __cabinetPicker.readCalls = 0; }")
            start_picker(page)
            page.locator("#toasts").get_by_text("That backup is larger than 16 MB. Choose a smaller backup.", exact=True).wait_for()
            check(stable_runs(page) == before_failures, "oversize picker read leaves saved data unchanged")
            check(
                page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.readCalls === 0"),
                "oversize picker avoids hidden fallback and document text access",
            )

            page.evaluate("() => { __cabinetPicker.mode = 'pending'; __cabinetPicker.resolve = null; }")
            open_before = page.evaluate("() => __cabinetPicker.openCalls")
            start_picker(page)
            start_picker(page)
            page.wait_for_function("(expected) => __cabinetPicker.openCalls === expected", arg=open_before + 1)
            check(stable_runs(page) == before_failures, "overlapping picker requests leave saved data unchanged")
            page.evaluate(
                """(payload) => {
                  __cabinetPicker.mode = 'normal';
                  __cabinetPicker.resolve([{ getFile: async () => ({ size: payload.length, text: async () => payload }) }]);
                }""",
                json.dumps(incoming_payload),
            )
            wait_picker_dialog(page)
            check(stable_runs(page) == before_failures, "staged picker review leaves saved data unchanged")
            check(
                page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.saveCalls === 0"),
                "all picker outcomes avoid hidden fallback and save APIs before reload",
            )
            page.locator('[data-action="close-dialog"]').first.click()

            page.evaluate("() => { __cabinetPicker.mode = 'normal'; }")
            start_picker(page)
            wait_picker_dialog(page)
            old_origin = page.evaluate("() => performance.timeOrigin")
            page.locator('[data-action="restore-merge"]').click()
            wait_reload(page, old_origin)
            merged = {record["key"]: record for record in read_runs(page)}
            check(
                set(merged) == {incoming_key, existing_key},
                f"Add missing imports the incoming save and preserves the existing save (actual {sorted(merged)})",
            )
            check(merged[incoming_key]["state"] == incoming_records[incoming_key]["state"], "Add missing retains incoming Sudoku state")
            check(merged[existing_key]["state"] == existing["state"], "Add missing retains existing Sudoku state")
            route(page, "#/settings")
            with page.expect_download() as download:
                page.locator('[data-action="recovery"]').click()
            add_recovery = json.loads(Path(download.value.path()).read_text(encoding="utf-8"))
            check(
                json.dumps(add_recovery["runs"], sort_keys=True, separators=(",", ":")) == before_failures,
                "Add missing keeps the exact pre-restore recovery runs",
            )

            page.evaluate("(payload) => { __cabinetPicker.payload = payload; __cabinetPicker.mode = 'normal'; }", json.dumps(incoming_payload))
            start_picker(page)
            wait_picker_dialog(page)
            page.locator('[data-action="restore-replace"]').click()
            old_origin = page.evaluate("() => performance.timeOrigin")
            page.locator('[data-action="restore-replace-confirm"]').click(force=True)
            wait_reload(page, old_origin)
            replaced = {record["key"]: record for record in read_runs(page)}
            check(set(replaced) == {incoming_key}, "Replace restores the imported save set")
            check(replaced[incoming_key]["state"] == incoming_records[incoming_key]["state"], "Replace retains imported Sudoku state")
            route(page, "#/settings")
            with page.expect_download() as download:
                page.locator('[data-action="recovery"]').click()
            replace_recovery = json.loads(Path(download.value.path()).read_text(encoding="utf-8"))
            check(
                {record["key"]: record for record in replace_recovery["runs"]} == merged,
                "Replace keeps the exact pre-restore recovery runs for both prior saves",
            )
            check(
                page.evaluate("() => __cabinetPicker.hiddenClicks === 0 && __cabinetPicker.saveCalls === 0"),
                "advertised picker outcomes avoid hidden fallback and save APIs",
            )
            check(not errors, "browser restore proof has no uncaught page errors")
        finally:
            if test_context is not None:
                test_context.close()
            if incoming_context is not None:
                incoming_context.close()
            browser.close()
    return {
        "passed": True,
        "assertions": len(checks),
        "checks": checks,
        "errors": errors,
        "build": identity,
        "scope": "Real-origin Chromium controls with isolated IndexedDB contexts and pre-bootstrap document picker fixtures; no hosted deployment, physical device or human accessibility claim.",
    }


try:
    result = run()
except Exception as error:
    errors.append(f"{type(error).__name__}: {error}")
    result = {
        "passed": False,
        "assertions": len(checks),
        "checks": checks,
        "errors": errors,
        "build": identity,
        "scope": "Real-origin Chromium controls with isolated IndexedDB contexts and pre-bootstrap document picker fixtures; no hosted deployment, physical device or human accessibility claim.",
    }
REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
REPORT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
