"""A held Enter checks one clue or favorite and does not undo it."""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8")
SCENE = next(
    item
    for item in json.loads((ROOT / "content/catalog.json").read_text(encoding="utf-8"))["puzzles"]
    if item["type"] == "scene"
)


def check(value, label):
    assert value, label
    print("PASS", label, flush=True)


def marks(page):
    return page.evaluate("() => (AlibiDiagnostics.getCurrent()?.state.clueMarks || []).join(',')")


def open_scene(page):
    page.evaluate(
        "(route) => location.hash = '#/' + route",
        f"play/{SCENE['id']}@{SCENE['revision']}",
    )
    page.wait_for_function(
        "(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=SCENE["id"]
    )
    if page.locator("dialog[open]").count():
        page.locator('dialog[open] [data-action="close-dialog"]').first.click()
        page.wait_for_function("!document.querySelector('dialog[open]')")


def hold_enter(page, ready):
    page.keyboard.down("Enter")
    page.wait_for_function(ready)
    page.keyboard.down("Enter")
    held = page.evaluate(ready)
    page.keyboard.up("Enter")
    return held


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.set_default_timeout(8000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(HTML, wait_until="load")
    page.wait_for_function("window.AlibiDiagnostics")
    open_scene(page)
    clue = page.locator('[data-action="clue"]').first
    clue.scroll_into_view_if_needed()
    clue.focus()
    check(marks(page) == "", "the first clue starts unchecked")
    held_clue = hold_enter(
        page, "() => (AlibiDiagnostics.getCurrent()?.state.clueMarks || []).join(',') === '0'"
    )
    print("RESULT", "clue-hold", held_clue, flush=True)
    check(held_clue is True, "a repeated Enter leaves the clue checked")
    page.keyboard.press("Enter")
    check(marks(page) == "", "a later Enter unchecks the clue")

    page.evaluate("() => { location.hash = '#/library' }")
    page.locator("#library-browse-all").click()
    page.wait_for_selector('[data-action="favorite"]')
    fav = page.locator('[data-action="favorite"]').first
    fav_id = fav.get_attribute("data-id")
    fav.focus()
    check(fav.get_attribute("aria-pressed") == "false", "the puzzle starts outside favorites")
    pressed = (
        "(id) => document.querySelector('[data-action=\"favorite\"][data-id=\"' + id + '\"]')"
        "?.getAttribute('aria-pressed') === 'true'"
    )
    page.keyboard.down("Enter")
    page.wait_for_function(pressed, arg=fav_id)
    page.keyboard.down("Enter")
    held_fav = page.evaluate(pressed, fav_id)
    print("RESULT", "favorite-hold", fav_id, held_fav, flush=True)
    check(held_fav is True, "a repeated Enter leaves the puzzle favorited")
    page.keyboard.up("Enter")
    page.keyboard.press("Enter")
    page.wait_for_function(
        "(id) => document.querySelector('[data-action=\"favorite\"][data-id=\"' + id + '\"]')"
        "?.getAttribute('aria-pressed') === 'false'",
        arg=fav_id,
    )
    check(True, "a later Enter removes the favorite")

    phone = browser.new_page(viewport={"width": 390, "height": 844})
    phone.set_default_timeout(8000)
    phone.on("pageerror", lambda error: errors.append(str(error)))
    phone.set_content(HTML, wait_until="load")
    phone.wait_for_function("window.AlibiDiagnostics")
    open_scene(phone)
    phone.locator('[data-action="quick-panel"][data-value="clues"]').click()
    quick = phone.locator('[data-action="quick-clue"]').first
    quick.focus()
    check(marks(phone) == "", "the mobile clue starts unchecked")
    held_quick = hold_enter(
        phone,
        "() => (AlibiDiagnostics.getCurrent()?.state.clueMarks || []).join(',') === '0'",
    )
    print("RESULT", "quick-hold", held_quick, flush=True)
    check(held_quick is True, "a repeated Enter leaves the mobile clue checked")
    phone.keyboard.press("Enter")
    check(marks(phone) == "", "a later Enter unchecks the mobile clue")
    check(not errors, "no page errors")
    browser.close()

print("PASS clue favorite repeat", flush=True)
