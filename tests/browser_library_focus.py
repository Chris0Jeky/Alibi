"""Keyboard regression for library filters, empty results and pagination."""
import json
import os
from pathlib import Path
from official_fixture import (
    OFFICIAL_COUNT,
    official_group_count,
    official_venue_count,
)

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("ALIBI_RESULTS", str(ROOT / "test-results" / "library-focus")))
URL = os.environ.get("ALIBI_URL", "http://127.0.0.1:8797").rstrip("/")
OUT.mkdir(parents=True, exist_ok=True)
MYSTERY_COUNT = official_group_count("mystery")
SALT_COUNT = official_venue_count("salt")
checks = []
errors = []


def check(value, label):
    assert value, label
    checks.append(label)
    print(f"PASS {label}", flush=True)


def active_id(page):
    return page.evaluate("document.activeElement?.id || document.activeElement?.tagName || ''")


def main():
    runtime = None
    screenshots = []
    with sync_playwright() as pw:
        launch = {"headless": True, "args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch["executable_path"] = os.environ["CHROMIUM_PATH"]
        elif Path("/usr/bin/chromium").exists():
            launch["executable_path"] = "/usr/bin/chromium"
        browser = pw.chromium.launch(**launch)
        try:
            for width in (390, 1440):
                context = browser.new_context(
                    viewport={"width": width, "height": 900}, reduced_motion="reduce"
                )
                page = context.new_page()
                page.set_default_timeout(5000)
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(URL + "/#/library")
                page.locator("#main").wait_for(state="visible")
                runtime = page.evaluate(
                    "({version: ALIBI_CONFIG.version, build: ALIBI_CONFIG.build})"
                )

                # Enter on the family filter keeps the newly selected filter as the keyboard anchor.
                page.locator('[data-action="browse-all"]').click()
                filter_button = page.locator("#library-filter-mystery")
                filter_button.focus()
                page.keyboard.press("Enter")
                expect(page.locator(".filter-meta")).to_contain_text(
                    f"{MYSTERY_COUNT} puzzles"
                )
                check(
                    active_id(page) == "library-filter-mystery",
                    f"Keyboard filter retains focus at {width}px",
                )

                # Search remains the active editing control while each input event re-renders the page.
                page.locator("#library-reset-filters").focus()
                page.keyboard.press("Enter")
                check(
                    active_id(page) == "main",
                    f"Removed filter control falls back to main at {width}px",
                )
                page.locator('[data-action="browse-all"]').click()
                search = page.locator("#library-search")
                search.focus()
                page.keyboard.type("sun", delay=20)
                check(
                    search.input_value() == "sun" and active_id(page) == "library-search",
                    f"Sequential search typing keeps focus at {width}px",
                )
                page.keyboard.press("ControlOrMeta+A")
                page.keyboard.type("no-match-zzzz", delay=10)
                expect(page.locator(".empty")).to_be_visible()
                check(
                    page.locator(".filter-meta").inner_text().startswith("0 puzzles")
                    and active_id(page) == "library-search",
                    f"Empty search keeps the editor usable at {width}px",
                )

                # Resetting the empty state returns to the browse screen and a stable landmark.
                page.locator("#library-clear-filters").focus()
                page.keyboard.press("Enter")
                expect(page.locator('[data-action="browse-all"]')).to_be_visible()
                check(
                    active_id(page) == "main",
                    f"Empty-state reset falls back to main at {width}px",
                )

                # Each page moves to its first new puzzle, including the final page.
                page.locator('[data-action="browse-all"]').click()
                expected_cards = 24
                while page.locator("#library-show-more").count():
                    first_new_index = expected_cards
                    page.locator("#library-show-more").focus()
                    page.keyboard.press("Enter")
                    expected_cards = min(expected_cards + 24, OFFICIAL_COUNT)
                    expect(page.locator(".puzzle-card")).to_have_count(expected_cards)
                    first_new = page.locator('.puzzle-card').nth(first_new_index).locator('[data-action="open"]')
                    expect(first_new).to_be_focused()
                    expect(first_new).to_be_in_viewport()
                    check(True, f"Show more focuses the first newly visible puzzle at {width}px ({expected_cards})")
                check(
                    page.locator("#library-show-more").count() == 0,
                    f"Final pagination control is removed at {width}px",
                )
                screenshot = OUT / f"library-focus-{width}.png"
                page.screenshot(path=str(screenshot))
                screenshots.append(str(screenshot.resolve()))

                # Existing family route and All puzzles escape remain intact after focus changes.
                page.reload()
                page.locator("#main").wait_for(state="visible")
                page.locator('.family-card[data-id="scene"]').focus()
                page.keyboard.press("Enter")
                expect(page).to_have_url(f"{URL}/#/library/scene")
                page.get_by_role("button", name="All puzzles", exact=True).focus()
                page.keyboard.press("Enter")
                expect(page).to_have_url(f"{URL}/#/library")
                expect(page.locator('[data-action="browse-all"]')).to_be_visible()
                check(
                    active_id(page) == "main",
                    f"Library family back path retains its route focus at {width}px",
                )

                # A storage notification is a background rerender while the first newly visible
                # card is focused. Its stable key must preserve both focus and the card's action.
                page.goto(URL + "/#/library")
                page.locator("#main").wait_for(state="visible")
                page.locator('[data-action="browse-all"]').click()
                page.locator("#library-show-more").focus()
                page.keyboard.press("Enter")
                first_new = page.locator('.puzzle-card').nth(24).locator('[data-action="open"]')
                expect(first_new).to_be_focused()
                card_id = first_new.get_attribute("id")
                puzzle_key = first_new.get_attribute("data-id")
                check(
                    card_id == f"library-card-{puzzle_key}",
                    f"First new library card has a stable focus ID at {width}px",
                )
                page.evaluate("window.dispatchEvent(new Event('alibi-storage-change'))")
                expect(first_new).to_be_focused()
                expect(first_new).to_be_in_viewport()
                check(
                    active_id(page) == card_id,
                    f"Background storage rerender preserves card focus and viewport at {width}px",
                )
                page.keyboard.press("Enter")
                expect(page.locator("dialog[open]")).to_be_visible()
                check(
                    page.evaluate("AlibiDiagnostics.getCurrent()?.key") == puzzle_key,
                    f"Preserved card still opens the correct puzzle at {width}px",
                )
                page.locator('dialog[open] [data-action="close-dialog"]').click()

                # Collection cards are also rerendered filter controls and need a stable anchor.
                curation_page = context.new_page()
                curation_page.set_default_timeout(5000)
                curation_page.on("pageerror", lambda error: errors.append(str(error)))
                curation_page.goto(URL + "/#/library")
                curation_page.locator("#main").wait_for(state="visible")
                browse_all = curation_page.locator('[data-action="browse-all"]')
                browse_all.wait_for(state="visible")
                browse_all.click()
                curation_page.locator(".curation-collections > summary").focus()
                curation_page.keyboard.press("Enter")
                salt = curation_page.locator(
                    '.curation-collections [data-action="curation-venue"][data-value="salt"]'
                )
                salt.focus()
                curation_page.keyboard.press("Enter")
                expect(curation_page.locator(".filter-meta")).to_contain_text(
                    f"{SALT_COUNT} puzzles"
                )
                collection_focus = active_id(curation_page)
                check(
                    collection_focus == "library-collection-salt",
                    f"Collection filter retains focus at {width}px (active {collection_focus})",
                )
                scope_all = curation_page.get_by_role(
                    "button", name="Show all collections", exact=True
                )
                scope_all.focus()
                curation_page.keyboard.press("Enter")
                expect(curation_page.locator(".filter-meta")).to_contain_text(f"{OFFICIAL_COUNT} puzzles")
                check(
                    active_id(curation_page) == "library-filter-status",
                    f"Removed collection escape focuses status at {width}px",
                )
                curation_page.locator("#library-collection-all").focus()
                curation_page.keyboard.press("Enter")
                check(
                    active_id(curation_page) == "library-collection-all",
                    f"All collections control retains focus at {width}px",
                )
                curation_page.close()
                context.close()
        finally:
            browser.close()

    check(not errors, "No browser page errors")
    receipt = {
        "passed": True,
        "checks": checks,
        "errors": errors,
        "runtime": runtime,
        "url": URL,
        "widths": [390, 1440],
        "screenshots": screenshots,
        "origin": URL,
        "scope": "real Chromium controls at the recorded origin; simulated viewports, not a physical device",
    }
    (OUT / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(json.dumps(receipt, indent=2), flush=True)


if __name__ == "__main__":
    main()
