"""Real-origin smoke test for the Cabinet-owned Castle practice adapter."""

import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/").split("#")[0]
OUTPUT = Path(os.environ.get("ALIBI_RESULTS", "test-results")) / "castle-practice"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(BASE + "#/home")
        page.get_by_role("button", name="Wrenmere Castle").click()
        page.wait_for_function("() => globalThis.AlibiCastle?.diagnostics().mode")
        expect(page.locator("#castle-main h1")).to_have_text("Wrenmere Castle")

        snapshot = page.evaluate("() => globalThis.AlibiDiagnostics.getPracticeSnapshot()")
        assert snapshot["available"] is True
        assert len(snapshot["rooms"]) == 13
        assert snapshot["rooms"]["observatory"]["total"] > 0
        assert snapshot["rooms"]["observatory"]["starters"][0]["id"] == "curated-binary-01"

        page.evaluate("() => { location.hash = '#/quiet/castle/room/observatory'; }")
        expect(page.locator('[data-do="practice"]').first).to_be_visible()
        page.locator('[data-do="practice"]').first.click()
        expect(page).to_have_url("**#/play/curated-binary-01%401")
        expect(page.locator(".practice-return")).to_contain_text("Return to Wrenmere")
        page.locator('[data-action="return-to-castle"]').click()
        expect(page).to_have_url("**#/quiet/castle/room/observatory")
        page.screenshot(path=str(OUTPUT / "practice.png"), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()
