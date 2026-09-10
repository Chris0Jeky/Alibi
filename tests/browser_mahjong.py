"""Actual Chromium controls for Mahjong Solitaire at phone and desktop widths."""
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
        if os.environ.get("ALIBI_URL"):
            page.goto(os.environ["ALIBI_URL"])
            page.wait_for_function(
                "()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady"
            )
        else:
            page.set_content(
                (ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8"),
                wait_until="load",
            )
        page.wait_for_function("() => globalThis.AlibiDiagnostics")

        def route(path):
            page.evaluate("(value) => (location.hash = value)", path)
            page.wait_for_timeout(180)

        route("/salon/mahjong")
        check(
            page.locator(".mahjong-tile").count() == 20,
            f"Mahjong renders twenty layered tiles at {width}px",
        )
        check(
            page.locator(".mahjong-tile.free").count() > 0,
            f"Mahjong exposes free tiles at {width}px",
        )
        page.locator(".mahjong-tile.free").first.click()
        check(
            page.locator('.mahjong-tile[aria-pressed="true"]').count() == 1,
            f"Selecting a free tile exposes its active state at {width}px",
        )
        check(
            page.locator(".mahjong-tile.match-target").count() == 1,
            f"Selecting a tile highlights its matching pair at {width}px",
        )
        page.locator(".mahjong-tile.match-target").click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.mahjong.log.length === 1"
        )
        check(
            page.locator(".mahjong-tile").count() == 18,
            f"A matching pair clears through an actual tile tap at {width}px",
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.mahjong.log[0].a")
            != page.evaluate("() => AlibiClub.diagnostics().state.runs.mahjong.log[0].b"),
            f"The persisted move contains two distinct tile ids at {width}px",
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.mahjong.log.length") == 1,
            f"The Mahjong move is saved at {width}px",
        )
        if os.environ.get("ALIBI_URL"):
            page.wait_for_timeout(500)
            context.set_offline(True)
            page.reload()
            page.wait_for_selector(".mahjong-tile")
            check(
                page.evaluate("() => AlibiClub.diagnostics().state.runs.mahjong.log.length") == 1,
                f"Placement survives offline reload at {width}px",
            )
        route("/home")
        check(
            "Mahjong Solitaire · MAHJONG-01" in page.locator(".club-letter").inner_text(),
            f"The active run card names Mahjong Solitaire at {width}px",
        )
        check(
            page.locator('.club-gamecard[data-id="mahjong"]').count() == 1,
            f"Home advertises a distinct Mahjong Solitaire card at {width}px",
        )
        route("/salon/mahjong")
        page.locator('[data-action="club-undo"][data-id="mahjong"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.mahjong.log.length === 0"
        )
        check(
            page.locator(".mahjong-tile").count() == 20,
            f"Undo restores the pair at {width}px",
        )
        page.locator('[data-action="club-redo"][data-id="mahjong"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.mahjong.log.length === 1"
        )
        check(
            page.locator(".mahjong-tile").count() == 18,
            f"Redo restores the cleared pair at {width}px",
        )
        page.locator("#mahjong-seed").fill("SECOND-TABLE")
        page.locator('[data-action="club-mahjong-use-seed"]').click()
        check(
            page.locator("dialog[open]").count() == 1,
            f"Changing seed asks before clearing at {width}px",
        )
        page.locator('[data-action="club-reset-confirm"]').click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.mahjong.seed === 'SECOND-TABLE'"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.mahjong.log.length") == 0,
            f"Confirmed seed change starts a fresh replay at {width}px",
        )
        check(not errors, f"Mahjong controls produce no browser errors at {width}px")
        context.close()
    print("PASS", len(checks), "Mahjong browser assertions.")
    browser.close()
