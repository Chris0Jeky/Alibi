"""Actual Chromium controls for Block Cabinet at phone and desktop widths."""
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
        if os.environ.get('ALIBI_URL'):
            page.goto(os.environ['ALIBI_URL'])
            page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        else:
            page.set_content(
                (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8"),
                wait_until="load",
            )
        page.wait_for_function("() => globalThis.AlibiDiagnostics")

        def route(path):
            page.evaluate("(value) => (location.hash = value)", path)
            page.wait_for_timeout(180)

        route("/salon/blockcabinet")
        check(
            page.locator(".block-cell").count() == 64,
            f"Block Cabinet renders an 8 by 8 board at {width}px",
        )
        check(
            page.locator(".block-piece").count() == 3,
            f"Block Cabinet renders three tray pieces at {width}px",
        )
        check(
            "rotation is intentionally unavailable" in page.locator(".club-rules").inner_text(),
            f"Block Cabinet explains fixed orientation at {width}px",
        )
        page.locator('[data-action="club-block-piece"]').first.click()
        check(
            page.locator('[data-action="club-block-piece"]').first.get_attribute("aria-pressed") == "true",
            f"Selecting a tray piece exposes its active state at {width}px",
        )
        check(
            page.locator(".block-cell.legal-origin").count() > 0,
            f"Selecting a piece highlights legal origins at {width}px",
        )
        page.locator(".block-cell.legal-origin").first.click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === 1"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length") == 1,
            f"A selected piece places through an actual board tap at {width}px",
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet.log[0].slot") == 0,
            f"The persisted move keeps its selected tray slot at {width}px",
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet.log[0].cell")
            == int(page.locator(".block-cell.filled").first.get_attribute("data-cell")),
            f"The board reflects the saved placement at {width}px",
        )
        route("/home")
        check(
            "Block Cabinet · BLOCK-01" in page.locator(".club-letter").inner_text(),
            f"The active run card names Block Cabinet at {width}px",
        )
        route("/salon/blockcabinet")
        page.locator('[data-action="club-undo"][data-id="blockcabinet"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === 0"
        )
        check(
            page.locator(".block-cell.filled").count() == 0,
            f"Undo clears the placed piece at {width}px",
        )
        page.locator('[data-action="club-redo"][data-id="blockcabinet"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === 1"
        )
        check(
            page.locator(".block-cell.filled").count() > 0,
            f"Redo restores the placed piece at {width}px",
        )
        if os.environ.get('ALIBI_URL'):
            page.wait_for_timeout(500)
            context.set_offline(True)
            page.reload()
            page.wait_for_selector('.block-cell.filled')
            check(page.evaluate('AlibiClub.diagnostics().state.runs.blockcabinet.log.length') == 1, f'Placement survives offline reload at {width}px')
        page.locator("#block-seed").fill("A2")
        page.locator('[data-action="club-block-use-seed"]').click()
        check(page.locator("dialog[open]").count() == 1, f"Changing seed asks before clearing at {width}px")
        page.locator('[data-action="club-reset-confirm"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.seed === 'A2'"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length") == 0,
            f"Confirmed seed change starts a fresh replay at {width}px",
        )
        page.locator('[data-action="club-block-piece"][data-value="0"]').click()
        page.locator('.block-cell[data-cell="0"].legal-origin').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === 1"
        )
        page.locator('[data-action="club-block-piece"][data-value="1"]').click()
        occupied_origin = page.locator('.block-cell[data-cell="25"]')
        check(
            "filled, legal origin for Cross" in occupied_origin.get_attribute("aria-label"),
            f"An occupied bounding corner exposes its legal origin to assistive technology at {width}px",
        )
        occupied_origin.click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === 2"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet.log[1].cell") == 25,
            f"The occupied legal origin remains an actual playable control at {width}px",
        )
        page.screenshot(path=str(ROOT / "test-results" / f"block-cabinet-play-{width}.png"), full_page=True)
        route("/home")
        check(
            page.locator('.club-gamecard[data-id="blockcabinet"]').count() == 1,
            f"Home advertises a distinct Block Cabinet card at {width}px",
        )
        page.screenshot(path=str(ROOT / "test-results" / f"block-cabinet-home-{width}.png"), full_page=True)
        check(not errors, f"Block Cabinet controls produce no browser errors at {width}px")
        context.close()
    print("PASS", len(checks), "Block Cabinet browser assertions.")
    browser.close()
