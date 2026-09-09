"""Keyboard regression for library filters, empty results and pagination."""
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "library-focus"
URL = os.environ.get("ALIBI_URL", "http://127.0.0.1:8797").rstrip("/")
OUT.mkdir(parents=True, exist_ok=True)
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
                expect(page.locator(".filter-meta")).to_contain_text("88 puzzles")
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

                # Repeated keyboard activation preserves the pagination anchor until it disappears.
                page.locator('[data-action="browse-all"]').click()
                expected_cards = 24
                while page.locator("#library-show-more").count():
                    page.locator("#library-show-more").focus()
                    page.keyboard.press("Enter")
                    expected_cards = min(expected_cards + 24, 328)
                    expect(page.locator(".puzzle-card")).to_have_count(expected_cards)
                    if expected_cards < 328:
                        check(
                            active_id(page) == "library-show-more",
                            f"Show more retains focus at {width}px ({expected_cards})",
                        )
                check(
                    active_id(page) == "library-filter-status"
                    and page.locator("#library-filter-status").inner_text().startswith("328 puzzles"),
                    f"Removed final pagination control focuses updated status at {width}px",
                )
                screenshot = OUT / f"library-focus-{width}.png"
                page.screenshot(path=str(screenshot), full_page=True)
                screenshots.append(str(screenshot.relative_to(ROOT)))

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
        "scope": "real Chromium controls on a local static origin; no hosted or physical-device claim",
    }
    (OUT / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(json.dumps(receipt, indent=2), flush=True)


if __name__ == "__main__":
    main()
