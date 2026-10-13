"""Pause cover keeps keyboard focus off the board. Not a hosted or physical-device test."""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8")
puzzle = next(
    p
    for p in json.loads((ROOT / "content/catalog.json").read_text(encoding="utf-8"))["puzzles"]
    if p["id"] == "sudoku-01"
)
checks = []


def check(value, label):
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


def dismiss(page):
    if page.locator("dialog[open]").count():
        page.locator('dialog[open] [data-action="close-dialog"]').first.click()
        page.wait_for_timeout(40)


with sync_playwright() as pw:
    launch = {"headless": True, "args": ["--no-sandbox"]}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = pw.chromium.launch(**launch)
    for width, height, name in ((1280, 900, "desktop"), (390, 844, "phone")):
        errors = []
        context = browser.new_context(
            viewport={"width": width, "height": height}, reduced_motion="reduce"
        )
        page = context.new_page()
        page.set_default_timeout(8000)
        page.on("pageerror", lambda e, sink=errors: sink.append(str(e)))
        page.set_content(html, wait_until="load")
        page.wait_for_function("window.AlibiDiagnostics")
        page.evaluate(
            "(p)=>location.hash='#/'+p", f"play/{puzzle['id']}@{puzzle['revision']}"
        )
        page.wait_for_function(
            "(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id", arg=puzzle["id"]
        )
        page.wait_for_timeout(80)
        dismiss(page)
        page.locator('.board-card button[data-action="cell"]').first.focus()
        before = page.evaluate("() => JSON.stringify(AlibiDiagnostics.getCurrent().state)")
        page.keyboard.press("Escape")
        page.wait_for_timeout(60)
        paused = page.evaluate(
            """() => {
              const active = document.activeElement;
              const cover = document.querySelector('.paused-cover');
              const cell = document.querySelector('#cell-0');
              const hint = document.querySelector('.board-card [data-action="hint"]');
              return {
                cover: !!cover,
                focusInCover: !!(cover && active && cover.contains(active) && active.dataset.action === 'pause'),
                cellInert: !!(cell && cell.closest('[inert]')),
                hintInert: !!(hint && hint.closest('[inert]')),
                cellIsActive: active && active.id === 'cell-0'
              };
            }"""
        )
        check(paused["cover"] and paused["focusInCover"], f"{name}: pause focus is the resume button")
        check(paused["cellInert"] and paused["hintInert"] and not paused["cellIsActive"], f"{name}: covered cell and hint are inert")
        shots = ROOT / "tests" / "screenshots"
        shots.mkdir(exist_ok=True)
        page.screenshot(path=str(shots / f"pause-focus-{name}.png"))
        page.keyboard.press("Tab")
        tabbed = page.evaluate(
            """() => {
              const active = document.activeElement;
              const card = document.querySelector('.board-card');
              return !(card && active && card.contains(active) && !active.closest('.paused-cover'));
            }"""
        )
        check(tabbed, f"{name}: Tab does not enter the covered board")
        page.keyboard.press("n")
        check(
            page.locator('[data-action="pencil"].active').count() == 0,
            f"{name}: N does not enable pencil while paused",
        )
        page.evaluate("() => document.querySelector('.board-card [data-action=\"hint\"]').click()")
        outside = page.locator('.play-nav [data-action="hint"]')
        if outside.count():
            outside.evaluate("el => el.click()")
        check(page.locator("dialog[open]").count() == 0, f"{name}: hint does not open while paused")
        after = page.evaluate("() => JSON.stringify(AlibiDiagnostics.getCurrent().state)")
        check(before == after, f"{name}: paused keyboard leaves the board unchanged")
        page.locator('.paused-cover [data-action="pause"]').click()
        page.wait_for_timeout(60)
        check(page.locator(".paused-cover").count() == 0, f"{name}: resume hides the cover")
        page.keyboard.press("1")
        page.wait_for_timeout(40)
        resumed = page.evaluate("() => JSON.stringify(AlibiDiagnostics.getCurrent().state)")
        check(resumed != before, f"{name}: a digit works again after resume")
        check(not errors, f"{name}: no page errors")
        context.close()
    browser.close()

print(f"{len(checks)} pause-focus checks passed")
sys.exit(0)
