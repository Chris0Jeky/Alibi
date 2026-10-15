"""A held digit adds one cell note and does not remove it."""
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


def selected_note(page):
    return page.evaluate(
        """() => {
          const cell = document.querySelector('.cell.selected');
          const grid = cell?.querySelector('.notes-grid');
          return {
            id: cell?.id || '',
            notes: (grid?.textContent || '').replace(/\\s+/g, ''),
            value: cell?.querySelector('.value')?.textContent || '',
          };
        }"""
    )


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
    check(
        page.locator('[data-action="pencil"].active').count() == 0,
        "a fresh puzzle has notes off",
    )
    page.keyboard.press("n")
    check(page.locator('[data-action="pencil"].active').count() == 1, "one N turns notes on")
    page.locator(".cell:not(.given)").first.click()
    page.keyboard.down("1")
    first = selected_note(page)
    check(first["notes"] == "1" and first["value"] == "", "the first 1 adds note 1")
    page.keyboard.down("1")
    second = selected_note(page)
    print("RESULT", "hold", first, second, flush=True)
    check(
        second["id"] == first["id"] and second["notes"] == "1" and second["value"] == "",
        "a repeated 1 leaves note 1",
    )
    page.keyboard.up("1")
    page.keyboard.press("1")
    cleared = selected_note(page)
    check(cleared["notes"] == "" and cleared["value"] == "", "a later 1 removes note 1")
    check(not errors, "no page errors")
    browser.close()

print("PASS note digit repeat", flush=True)
