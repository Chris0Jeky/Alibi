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


def home_and_back(page):
    # Use rendered navigation controls, including the settings Workshop entry on phones.
    page.locator('[data-action="navigate"][data-page="home"]:visible').first.click()
    page.wait_for_function("() => location.hash === '#/home' && !document.querySelector('#scene-form')")
    page.locator('[data-action="navigate"][data-page="settings"]:visible').first.click()
    page.locator('[data-action="navigate"][data-page="workshop"]:visible').first.click()
    page.locator(".draft-editor").wait_for()


cases = [f"{op}-{change}-{outcome}" for op in ("verify", "generate")
         for change in ("edit", "route") for outcome in ("success",)]
cases += [f"verify-{change}-error" for change in ("edit", "route", "current")]
cases += ["generate-form-success"]
selected = os.environ.get("ALIBI_RACE_CASE")
if selected:
    cases = [selected]

with sync_playwright() as pw:
    launch = {"headless": True}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = pw.chromium.launch(**launch)
    for case in cases:
        op, change, outcome = case.split("-")
        context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        make_draft(page)
        if outcome == "error":
            while page.locator('[data-action="remove-draft-clue"]').count():
                page.locator('[data-action="remove-draft-clue"]').first.click()
        old_room = page.locator('.draft-cell[data-cell="0"] .draft-room').inner_text()
        old_title = page.locator('.draft-editor h2').inner_text()
        new_room = "B" if old_room != "B" else "C"
        page.evaluate(HOLD, "draft" if op == "verify" else "generate")
        if op == "verify":
            page.locator('[data-action="verify-draft"]').click()
        else:
            page.locator("#draft-seed").fill("8")
            if change == "form":
                page.locator("#draft-title").fill("Pending case")
            page.get_by_role("button", name="Generate draft", exact=True).click()
        page.wait_for_function("() => delivery.held !== null")
        check(page.evaluate("!!delivery.held.event.data.error") == (outcome == "error"),
              case + ": actual worker outcome")
        if change == "edit":
            page.locator(f'[data-action="draft-paint"][data-value="{ord(new_room)-65}"]').click()
            page.locator('[data-action="draft-cell"][data-cell="0"]').click()
            page.locator('[data-room-name="0"]').fill("New room name")
            page.locator('[data-room-name="0"]').press("Tab")
        elif change == "route":
            home_and_back(page)
        elif change == "form":
            page.locator("#draft-title").fill("New case")
        page.evaluate("delivery.release()")
        page.wait_for_function("() => !document.querySelector('[data-action=\"verify-draft\"]').disabled")
        page.wait_for_timeout(80)  # Allow the delegated action's rejection handler to run.
        if change == "edit":
            check(page.locator('.draft-cell[data-cell="0"] .draft-room').inner_text() == new_room,
                  case + ": native room painting survives")
            check(page.locator('[data-room-name="0"]').input_value() == "New room name",
                  case + ": native room name survives")
            check("recheck required" in page.locator(".draft-editor .badge").inner_text(),
                  case + ": edited draft stays unverified")
            stored = page.evaluate("""() => new Promise((resolve, reject) => {
              const request = indexedDB.open('alibi-device', 1);
              request.onsuccess = () => {
                const db = request.result, tx = db.transaction('meta'), get = tx.objectStore('meta').get('workshop-draft');
                get.onsuccess = () => resolve(get.result.value.puzzle);
                tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error);
              }; request.onerror = () => reject(request.error);
            })""")
            check(stored["rooms"][0] == ord(new_room)-65 and stored["roomNames"][0] == "New room name",
                  case + ": IndexedDB retains native edits")
        elif change == "route":
            check(page.locator('.draft-cell[data-cell="0"] .draft-room').inner_text() == old_room,
                  case + ": returning to Workshop retains its original draft")
        elif change == "form":
            check(page.locator('.draft-editor h2').inner_text() == old_title,
                  case + ": obsolete generation cannot replace the draft")
            check(page.locator('#draft-title').input_value() == "New case",
                  case + ": new generator fields survive")
        if change != "current":
            check(page.locator("#toasts").inner_text() == "", case + ": no obsolete success or error feedback")
        else:
            check(bool(page.locator("#toasts").inner_text()), case + ": current validation failure is reported")
        page.screenshot(path=str(RESULTS / (case + ".png")), full_page=True)
        context.close()
    # Ordinary verification and generation still work through the same controls.
    if not selected:
        for width in (390, 1440):
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            make_draft(page)
            page.locator('[data-action="verify-draft"]').click()
            page.get_by_text("Verified. Exactly one arrangement satisfies these clues.", exact=True).wait_for()
            check("One unique solution" in page.locator(".draft-editor .badge").inner_text(),
                  f"{width}px: normal verification still publishes")
            page.screenshot(path=str(RESULTS / f"normal-{width}.png"), full_page=True)
            context.close()
    browser.close()
check(not errors, "No page errors")
(RESULTS / "results.json").write_text(json.dumps({"url": BASE, "checks": checks, "errors": errors}, indent=2))
