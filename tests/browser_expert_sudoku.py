"""Exercise the Expert filter, provisional badge and a real Sudoku control."""
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787").rstrip("/")
OUT = Path(os.environ.get("ALIBI_RESULTS", str(ROOT / "test-results" / "expert-browser")))
OUT.mkdir(parents=True, exist_ok=True)


def main():
    checks = []
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
        for width in (390, 1440):
            context = browser.new_context(
                viewport={"width": width, "height": 900},
                reduced_motion="reduce",
                service_workers="block",
            )
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(URL + "/#/library")
            page.locator("[data-action='browse-all']").click()
            page.locator("#difficulty-filter").select_option("Expert")
            expect(page.locator(".filter-meta")).to_contain_text("3 puzzles")
            expect(page.locator(".puzzle-card")).to_have_count(3)
            expect(page.locator(".difficulty").first).to_have_text("Expert · provisional")
            checks.append(f"Expert filter shows three provisional puzzles at {width}px")
            page.locator(".puzzle-card [data-action='open']").first.click()
            expect(page.locator(".play-head")).to_be_visible()
            expect(page.locator("dialog[open] .dialog-close")).to_be_visible()
            page.locator("dialog[open] .dialog-close").click()
            page.locator("#cell-0").click()
            page.locator("[data-action='value'][data-value='3']").click()
            expect(page.locator("#cell-0")).to_have_text("3")
            checks.append(f"Expert Sudoku accepts a real numberpad placement at {width}px")
            context.close()
        browser.close()
    report = {"passed": not errors, "checks": checks, "errors": errors, "url": URL}
    (OUT / "results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if errors:
        raise AssertionError(errors)
    print(f"PASS {len(checks)} Expert browser checks", flush=True)


if __name__ == "__main__":
    main()
