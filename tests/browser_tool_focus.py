"""Tool buttons without an id keep focus after the board redraws."""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8")
PUZZLES = json.loads((ROOT / "content/catalog.json").read_text(encoding="utf-8"))["puzzles"]


def check(value, label):
    assert value, label
    print("PASS", label, flush=True)


def open_play(page):
    puzzle = next(item for item in PUZZLES if item["type"] == "sudoku")
    page.evaluate("(route) => location.hash = '#/' + route", f"play/{puzzle['id']}@{puzzle['revision']}")
    page.wait_for_function(
        "(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=puzzle["id"]
    )
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_function("!document.querySelector('dialog[open]')")


def focused(page):
    return page.evaluate(
        """() => {
      const el = document.activeElement;
      return {
        action: el?.dataset?.action || '',
        value: Object.prototype.hasOwnProperty.call(el?.dataset || {}, 'value') ? el.dataset.value : '',
        id: el?.id || '',
        tag: el?.tagName || ''
      };
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
    open_play(page)

    pencil = page.locator('[data-action="pencil"]')
    pencil.scroll_into_view_if_needed()
    pencil.focus()
    before = focused(page)
    check(before["action"] == "pencil" and before["id"] == "", "cell notes is focused and has no id")
    check(page.locator('[data-action="pencil"].active').count() == 0, "cell notes start off")
    page.keyboard.down("Enter")
    check(page.locator('[data-action="pencil"].active').count() == 1, "the first Enter turns notes on")
    page.keyboard.down("Enter")
    held = page.locator('[data-action="pencil"].active').count()
    print("RESULT", "enter-hold", held, flush=True)
    check(held == 1, "a repeated Enter leaves notes on")
    page.keyboard.up("Enter")
    page.keyboard.press("Enter")
    check(page.locator('[data-action="pencil"].active').count() == 0, "a later Enter turns notes off")

    zoom = page.locator("#play-zoom")
    zoom.focus()
    check(zoom.get_attribute("aria-pressed") == "false", "board size starts normal")
    page.keyboard.down("Enter")
    check(zoom.get_attribute("aria-pressed") == "true", "the first Enter enlarges the board")
    page.keyboard.down("Enter")
    held_zoom = zoom.get_attribute("aria-pressed")
    print("RESULT", "zoom-hold", held_zoom, flush=True)
    check(held_zoom == "true", "a repeated Enter leaves the board enlarged")
    page.keyboard.up("Enter")
    page.keyboard.press("Enter")
    check(zoom.get_attribute("aria-pressed") == "false", "a later Enter uses the normal board size")

    pause = page.locator("#play-pause")
    pause.focus()
    check(page.locator(".paused-cover").count() == 0, "the board starts running")
    page.keyboard.down("Enter")
    check(page.locator(".paused-cover").count() == 1, "the first Enter pauses")
    page.keyboard.down("Enter")
    held_pause = page.locator(".paused-cover").count()
    print("RESULT", "pause-hold", held_pause, flush=True)
    check(held_pause == 1, "a repeated Enter leaves the board paused")
    page.keyboard.up("Enter")
    page.keyboard.press("Enter")
    check(page.locator(".paused-cover").count() == 0, "a later Enter resumes")

    pencil.focus()
    page.keyboard.press("n")
    page.wait_for_function(
        """() => {
      const el = document.querySelector('[data-action="pencil"]');
      return !!el && el.getAttribute('aria-pressed') === 'true';
    }"""
    )
    after = focused(page)
    print("RESULT", "pencil", after, flush=True)
    check(after["action"] == "pencil", "cell notes stays focused after N redraws the board")

    key = page.locator('[data-action="value"][data-value="2"]')
    key.scroll_into_view_if_needed()
    key.focus()
    page.keyboard.press("1")
    page.wait_for_timeout(150)
    digit = focused(page)
    print("RESULT", "digit", digit, flush=True)
    check(
        digit["action"] == "value" and digit["value"] == "2",
        "number key 2 stays focused after placing a digit",
    )

    phone = browser.new_page(viewport={"width": 390, "height": 800}, is_mobile=True, has_touch=True)
    phone.set_default_timeout(8000)
    phone.on("pageerror", lambda error: errors.append(str(error)))
    phone.set_content(HTML, wait_until="load")
    phone.wait_for_function("window.AlibiDiagnostics")
    open_play(phone)
    phone_pencil = phone.locator('[data-action="pencil"]')
    phone_pencil.scroll_into_view_if_needed()
    phone_pencil.focus()
    phone.keyboard.press("n")
    phone.wait_for_function(
        """() => document.querySelector('[data-action="pencil"]')?.getAttribute('aria-pressed') === 'true'"""
    )
    phone_after = focused(phone)
    print("RESULT", "phone", phone_after, flush=True)
    check(phone_after["action"] == "pencil", "phone cell notes stays focused after N redraws the board")
    check(not errors, "no page errors" if not errors else "page errors: " + " | ".join(errors))
    browser.close()
