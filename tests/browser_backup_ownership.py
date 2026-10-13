"""Actual backup file controls; hold only compiled worker message delivery.

Disposable local-origin profiles and app-exported synthetic backups. No destructive
restore action is clicked. ALIBI_RACE_CASE selects one baseline reproduction.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/").rstrip("/") + "/"
RESULTS = ROOT / "test-results" / "backup-ownership"
RESULTS.mkdir(parents=True, exist_ok=True)
checks, errors = [], []
HOLD = """type => {
  const Native = Worker;
  window.delivery = { type, held: null };
  window.Worker = class extends Native {
    postMessage(message) { this.kind = message.type; super.postMessage(message); }
    set onmessage(callback) {
      super.onmessage = event => {
        if (this.kind === delivery.type) delivery.held = { callback, event };
        else callback(event);
      };
    }
  };
  delivery.release = () => {
    const { callback, event } = delivery.held;
    delivery.type = null; callback(event);
  };
}"""


def check(value, label):
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


def settings(page):
    page.goto(BASE + "#/settings")
    page.wait_for_function("() => !!window.AlibiDiagnostics")
    page.wait_for_function("() => AlibiDiagnostics.getStatus().mode === 'indexeddb'")
    page.locator('[data-action="export-all"]').wait_for()


def submit(page, kind, data):
    if kind == "combined":
        page.locator('[data-action="import-all"]').click()
    page.locator('#all-backup-input' if kind == "combined" else '#backup-input').set_input_files({
        "name": "synthetic-backup.json", "mimeType": "application/json",
        "buffer": json.dumps(data).encode(),
    })


cases = [f"{kind}-error" for kind in ("cabinet", "combined")]
selected = os.environ.get("ALIBI_RACE_CASE")
if selected:
    cases = [selected]

with sync_playwright() as pw:
    launch = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = pw.chromium.launch(**launch)
    # Both incoming files come from ordinary rendered app export controls.
    source = browser.new_context(accept_downloads=True)
    page = source.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    settings(page)
    backups = {}
    for kind, action in (("cabinet", "export"), ("combined", "export-all")):
        with page.expect_download() as exported:
            page.locator(f'[data-action="{action}"]').click()
        backups[kind] = json.loads(Path(exported.value.path()).read_text(encoding="utf-8"))
    source.close()
    for case in cases:
        kind, outcome = case.split("-")
        context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        settings(page)
        before = page.evaluate("() => AlibiDiagnostics.getCounts()")
        page.evaluate(HOLD, "cabinet-backup" if kind == "cabinet" else "combined-backup")
        data = json.loads(json.dumps(backups[kind]))
        if outcome == "error":
            (data if kind == "cabinet" else data["sections"]["cabinet"])["runs"] = [{"schemaVersion": 99}]
        submit(page, kind, data)
        page.wait_for_function("() => delivery.held !== null")
        check(page.evaluate("() => !!delivery.held.event.data.error") == (outcome == "error"),
              case + ": actual worker outcome")
        page.locator('[data-action="navigate"][data-page="home"]:visible').first.click()
        page.wait_for_function("() => location.hash === '#/home' && !document.querySelector('#all-backup-input')")
        if outcome == "error":
            # Old failures must not close a modal belonging to the new route either.
            page.locator('[data-action="navigate"][data-page="settings"]:visible').first.click()
            page.locator('[data-action="choose-lesson"]').click()
            page.locator('#dialog-title').filter(has_text="Choose a little lesson.").wait_for()
        page.evaluate("delivery.release()")
        page.wait_for_timeout(120)
        if outcome == "success":
            check(not page.locator('dialog[open]').count(), case + ": restore dialog stays closed on Home")
        else:
            check(page.locator('dialog[open]').count() == 1 and
                  page.locator('#dialog-title').inner_text() == "Choose a little lesson.",
                  case + ": new route retains its own modal")
            check(page.locator('#toasts').inner_text() == "", case + ": no obsolete validation error")
        check(page.evaluate("() => AlibiDiagnostics.getCounts()") == before, case + ": no saved data was restored")
        page.screenshot(path=str(RESULTS / (case + ".png")), full_page=True)
        context.close()
    if not selected:
        for width in (390, 1440):
            for kind in ("cabinet", "combined"):
                context = browser.new_context(viewport={"width": width, "height": 900})
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                settings(page)
                submit(page, kind, backups[kind])
                title = "Restore your progress." if kind == "cabinet" else "Choose a section to restore"
                page.locator('dialog[open] #dialog-title').filter(has_text=title).wait_for()
                check(page.locator('#dialog-title').inner_text() == title, f"{width}px {kind}: normal restore review opens")
                page.screenshot(path=str(RESULTS / f"normal-{kind}-{width}.png"), full_page=True)
                page.get_by_role('button', name='Cancel', exact=True).click()
                context.close()
    browser.close()
check(not errors, "No page errors")
(RESULTS / 'results.json').write_text(json.dumps({"url": BASE, "checks": checks, "errors": errors}, indent=2))
