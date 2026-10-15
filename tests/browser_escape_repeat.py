"""A held Escape closes a dialog without pausing, and does not flicker pause."""
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


def open_play(page):
    page.evaluate(
        "(route) => location.hash = '#/' + route",
        f"play/{PUZZLE['id']}@{PUZZLE['revision']}",
    )
    page.wait_for_function(
        "(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=PUZZLE["id"]
    )
    if page.locator("dialog[open]").count():
        page.locator('dialog[open] [data-action="close-dialog"]').first.click()
        page.wait_for_function("!document.querySelector('dialog[open]')")


def paused(page):
    return page.locator(".paused-cover").count() > 0


def watch_escape(page):
    page.evaluate(
        """() => {
      window.__escapes = [];
      if (window.__escapeWatch) return;
      window.__escapeWatch = true;
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        window.__escapes.push({
          repeat: e.repeat,
          dialog: !!document.querySelector('dialog[open]')
        });
      }, true);
    }"""
    )


def escapes(page):
    return page.evaluate("window.__escapes")


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.set_default_timeout(8000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content(HTML, wait_until="load")
    page.wait_for_function("window.AlibiDiagnostics")
    open_play(page)
    check(not paused(page), "a fresh puzzle is not paused")

    page.locator("#play-help").click()
    page.wait_for_function("!!document.querySelector('dialog[open]')")
    watch_escape(page)
    page.keyboard.down("Escape")
    page.wait_for_function("!document.querySelector('dialog[open]')")
    check(not paused(page), "the Escape that closes help does not pause")
    page.keyboard.down("Escape")
    seen = escapes(page)
    print("RESULT", "help-hold", seen, "paused", paused(page), flush=True)
    check(len(seen) >= 2 and seen[1]["repeat"] is True, "the second Escape is a repeat")
    check(not paused(page), "holding Escape after help closes does not pause")
    page.keyboard.up("Escape")
    page.keyboard.press("Escape")
    check(paused(page), "a later Escape still pauses")
    page.keyboard.press("Escape")
    check(not paused(page), "the next Escape resumes")

    watch_escape(page)
    page.keyboard.down("Escape")
    check(paused(page), "Escape with no dialog pauses once")
    page.keyboard.down("Escape")
    held = escapes(page)
    print("RESULT", "board-hold", held, "paused", paused(page), flush=True)
    check(len(held) >= 2 and held[1]["repeat"] is True, "the board hold is a repeat")
    check(paused(page), "holding Escape does not immediately resume")
    page.keyboard.up("Escape")
    page.keyboard.press("Escape")
    check(not paused(page), "releasing and pressing Escape resumes")

    check(not errors, "no page errors" if not errors else "page errors: " + " | ".join(errors))
    browser.close()
