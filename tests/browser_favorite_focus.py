"""Removing a favorite from the favorites list does not focus the next one."""
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


def active(page):
    return page.evaluate(
        """() => {
      const el = document.activeElement;
      return { id: el?.id || '', action: el?.dataset?.action || '', dataId: el?.dataset?.id || '' };
    }"""
    )


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.set_default_timeout(8000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(HTML, wait_until="load")
    page.wait_for_function("window.AlibiDiagnostics")
    page.evaluate("(route) => location.hash = '#/' + route", "library/sudoku")
    page.wait_for_selector('[data-action="favorite"]')
    if page.locator("dialog[open]").count():
        page.locator('dialog[open] [data-action="close-dialog"]').first.click()
        page.wait_for_function("!document.querySelector('dialog[open]')")
    first = page.locator('[data-action="favorite"]').nth(0).get_attribute("data-id")
    second = page.locator('[data-action="favorite"]').nth(1).get_attribute("data-id")
    check(first and second and first != second, "two sudoku cards can be favored")
    page.locator(f'[data-action="favorite"][data-id="{first}"]').click()
    page.locator(f'[data-action="favorite"][data-id="{first}"][aria-pressed="true"]').wait_for()
    page.locator(f'[data-action="favorite"][data-id="{second}"]').click()
    page.locator(f'[data-action="favorite"][data-id="{second}"][aria-pressed="true"]').wait_for()
    page.locator("#status-filter").select_option("favorites")
    page.wait_for_function(
        """(ids) => {
          const shown = [...document.querySelectorAll('[data-action="favorite"]')].map((el) => el.dataset.id);
          return shown.length === 2 && shown.includes(ids[0]) && shown.includes(ids[1]);
        }""",
        arg=[first, second],
    )
    page.locator(f'[data-action="favorite"][data-id="{first}"]').focus()
    page.keyboard.press("Enter")
    page.wait_for_function(
        "(id) => !document.querySelector(`[data-action='favorite'][data-id='${id}']`)",
        arg=first,
    )
    got = active(page)
    print("RESULT", "favorite-focus", got, "removed", first, "kept", second, flush=True)
    check(got["id"] == "main", "a removed favorite returns focus to the page")
    check(
        page.locator(f'[data-action="favorite"][data-id="{second}"]').count() == 1,
        "the next favorite stays on the list",
    )
    check(not errors, "no page errors")
    browser.close()

print("PASS favorite focus", flush=True)
