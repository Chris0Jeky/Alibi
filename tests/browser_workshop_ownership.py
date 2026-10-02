"""Native Workshop controls with delayed delivery from the actual compiled worker.

Uses disposable browser contexts on a built local HTTP origin. No worker result or
application source is replaced. ALIBI_RACE_CASE selects one baseline reproduction.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/").rstrip("/") + "/"
RESULTS = ROOT / "test-results" / "workshop-ownership"
RESULTS.mkdir(parents=True, exist_ok=True)
checks, errors = [], []
HOLD = """type => {
  const Native = Worker;
  window.delivery = { type, held: null, released: false };
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
    delivery.type = null;
    callback(event);
    delivery.released = true;
  };
}"""


def check(value, label):
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


def make_draft(page):
    page.goto(BASE + "#/workshop")
    page.wait_for_function("() => !!window.AlibiDiagnostics")
    page.wait_for_function("() => AlibiDiagnostics.getStatus().mode === 'indexeddb'")
    page.locator("#draft-seed").fill("7")
    page.get_by_role("button", name="Generate draft", exact=True).click()
    page.locator(".draft-editor .badge").filter(has_text="One unique solution").wait_for()
    page.wait_for_function("() => AlibiDiagnostics.getStatus().offlineReady")

with sync_playwright() as pw:
    launch = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = pw.chromium.launch(**launch)
    for width in (390, 1440):
        context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        make_draft(page)
        old_title = page.locator('.draft-editor h2').inner_text()
        page.evaluate(HOLD, "generate")
        page.locator("#draft-seed").fill("8")
        page.locator("#draft-title").fill("Pending case")
        page.get_by_role("button", name="Generate draft", exact=True).click()
        page.wait_for_function("() => !!delivery.held")
        check(not page.evaluate("() => !!delivery.held.event.data.error"), f"{width}px: actual generation succeeds")
        page.locator("#draft-title").fill("New case")
        page.evaluate("() => delivery.release()")
        page.wait_for_function("() => !document.querySelector('#scene-form button[type=submit]').disabled")
        check(page.locator('.draft-editor h2').inner_text() == old_title, f"{width}px: stale generated draft is not published")
        check(page.locator('#draft-title').input_value() == "New case", f"{width}px: edited generator field survives")
        page.screenshot(path=str(RESULTS / f"generator-input-{width}.png"), full_page=True)
        page.get_by_role("button", name="Generate draft", exact=True).click()
        page.wait_for_function("() => !document.querySelector('#scene-form button[type=submit]').disabled")
        check(page.locator('.draft-editor h2').inner_text() == "New case", f"{width}px: current generation publishes the new title")
        context.close()
    browser.close()
check(not errors, "No page errors")
(RESULTS / "results.json").write_text(json.dumps({"url": BASE, "checks": checks, "errors": errors}, indent=2))
