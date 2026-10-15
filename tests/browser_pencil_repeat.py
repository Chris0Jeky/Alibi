"""A held N turns Cell notes on once and does not turn them off."""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8")
PUZZLE = next(
    item
    for item in json.loads((ROOT / "content/catalog.json").read_text(encoding="utf-8"))["puzzles"]
    if item["type"] == "sudoku"
)


def check(value, label):
    assert value, label
    print("PASS", label, flush=True)


def notes_on(page):
    return page.locator('[data-action="pencil"].active').count()


def open_play(page):
    page.evaluate(
        "(route) => location.hash = '#/' + route",
        f"play/{PUZZLE['id']}@{PUZZLE['revision']}",
    )
    page.wait_for_function(
        "(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=PUZZLE["id"]
    )
    page.wait_for_selector('[data-action="pencil"]')
    if page.locator("dialog[open]").count():
        page.locator('dialog[open] [data-action="close-dialog"]').first.click()
        page.wait_for_function("!document.querySelector('dialog[open]')")


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.set_default_timeout(8000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(HTML, wait_until="load")
    page.wait_for_function("window.AlibiDiagnostics")
    open_play(page)
    check(notes_on(page) == 0, "a fresh puzzle has notes off")
    page.keyboard.down("n")
    first = notes_on(page)
    check(first > 0, "the first N turns notes on")
    page.keyboard.down("n")
    second = notes_on(page)
    print("RESULT", "hold", first, second, flush=True)
    check(second == first and second > 0, "a repeated N leaves notes on")
    page.keyboard.up("n")
    page.keyboard.press("n")
    check(notes_on(page) == 0, "a later N turns notes off")
    check(not errors, "no page errors")
    browser.close()

print("PASS pencil repeat", flush=True)
