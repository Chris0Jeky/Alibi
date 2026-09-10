"""Actual Chromium controls for Draw Dominoes at phone and desktop widths."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
checks = []
errors = []


def check(value, label):
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


with sync_playwright() as playwright:
    launch = {"headless": True, "args": ["--no-sandbox"]}
    if os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    elif Path("/usr/bin/chromium").exists():
        launch["executable_path"] = "/usr/bin/chromium"
    browser = playwright.chromium.launch(**launch)
    for width, height in [(390, 844), (1440, 1000)]:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            accept_downloads=True,
            reduced_motion="no-preference",
        )
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_content(
            (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8"),
            wait_until="load",
        )
        page.wait_for_function("() => globalThis.AlibiDiagnostics")

        def route(path):
            page.evaluate("(value) => (location.hash = value)", path)
            page.wait_for_timeout(180)

        route("/salon/dominoes")
        check(
            page.locator(".domino-hand-tile").count() == 7,
            f"Draw Dominoes deals seven tiles at {width}px",
        )
        check(
            page.locator(".domino-chain-piece").count() == 0,
            f"Draw Dominoes starts with an empty chain at {width}px",
        )
        check(
            "28 unique tiles" in page.locator(".club-rules").inner_text()
            and "offline keeper" in page.locator(".club-rules").inner_text(),
            f"Draw Dominoes explains the local rules at {width}px",
        )
        first_tile = page.locator('[data-action="club-domino-tile"]').first
        first_tile.click()
        check(
            first_tile.get_attribute("aria-pressed") == "true",
            f"Selecting a domino exposes its active state at {width}px",
        )
        opening = page.locator('[data-action="club-domino-end"][data-value="start"]')
        check(opening.is_enabled(), f"The selected tile exposes an opening control at {width}px")
        opening.click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.dominoes.log.length === 1"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.dominoes.log.length") == 1,
            f"A selected tile opens the chain through an actual tap at {width}px",
        )
        check(
            page.locator(".domino-chain-piece").count() >= 1,
            f"The board reflects the played chain at {width}px",
        )
        route("/home")
        check(
            "Draw Dominoes · DOMINO-01" in page.locator(".club-letter").inner_text(),
            f"The active run card names Draw Dominoes at {width}px",
        )
        route("/salon/dominoes")
        page.locator('[data-action="club-undo"][data-id="dominoes"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.dominoes.log.length === 0"
        )
        check(
            page.locator(".domino-chain-piece").count() == 0,
            f"Undo clears the domino chain at {width}px",
        )
        page.locator('[data-action="club-redo"][data-id="dominoes"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.dominoes.log.length === 1"
        )
        check(
            page.locator(".domino-chain-piece").count() >= 1,
            f"Redo restores the domino chain at {width}px",
        )
        page.locator("#domino-seed").fill("SECOND-DOMINO")
        page.locator('[data-action="club-domino-use-seed"]').click()
        check(
            page.locator("dialog[open]").count() == 1,
            f"Changing seed asks before clearing at {width}px",
        )
        page.locator('[data-action="club-reset-confirm"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.dominoes.seed === 'SECOND-DOMINO'"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.dominoes.log.length") == 0,
            f"Confirmed seed change starts a fresh round at {width}px",
        )
        page.screenshot(path=str(ROOT / "test-results" / f"dominoes-play-{width}.png"), full_page=True)
        route("/home")
        check(
            page.locator('.club-gamecard[data-id="dominoes"]').count() == 1,
            f"Home advertises a distinct Draw Dominoes card at {width}px",
        )
        page.screenshot(path=str(ROOT / "test-results" / f"dominoes-home-{width}.png"), full_page=True)
        check(not errors, f"Draw Dominoes controls produce no browser errors at {width}px")
        context.close()
    print("PASS", len(checks), "Draw Dominoes browser assertions.")
    browser.close()
