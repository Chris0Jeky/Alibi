"""Actual Chromium controls for Tic-Tac-Toe; no hosted or physical-device claim."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/tic-tac-toe'
OUT.mkdir(parents=True, exist_ok=True)
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
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
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

    def action(name, extra=""):
        page.locator('[data-action="' + name + '"]' + extra + ":visible").first.click()

    def route(path):
        page.evaluate("(value) => (location.hash = value)", path)
        page.wait_for_timeout(180)

    route("/salon/tictactoe")
    check(page.locator(".tictactoe-cell").count() == 9, "Tic-Tac-Toe renders nine actual cells")
    labels = page.locator(".tictactoe-cell").evaluate_all(
        "els => els.map(e => e.getAttribute('aria-label'))"
    )
    check(
        all(label.startswith("Row ") and ", column " in label for label in labels),
        "Tic-Tac-Toe cells expose row and column labels",
    )
    check(
        page.locator('[data-action="club-tictactoe-mode"]').count() == 2,
        "Tic-Tac-Toe exposes bot and local modes",
    )
    page.locator('.tictactoe-cell:not([disabled])').first.click()
    page.wait_for_function(
        "() => AlibiClub.diagnostics().state.runs.tictactoe.log.length === 2"
    )
    check(
        not page.evaluate("() => AlibiClub.diagnostics().botPending"),
        "Keeper replies through the offline worker",
    )
    check(
        page.evaluate("() => AlibiClub.diagnostics().state.runs.tictactoe.log.length") == 2,
        "Bot reply is part of the persisted replay",
    )

    action("club-tictactoe-mode", '[data-value="local"]')
    check(page.locator("dialog[open]").count() == 1, "Changing mode asks before clearing a match")
    action("club-reset-confirm")
    page.wait_for_timeout(120)
    check(
        page.evaluate("() => AlibiClub.diagnostics().state.runs.tictactoe.mode") == "local",
        "Local two-player mode is selectable",
    )
    check(
        page.evaluate("() => AlibiClub.diagnostics().state.runs.tictactoe.log.length") == 0,
        "Mode change starts a fresh replay after confirmation",
    )

    for cell in [0, 3, 1, 4, 2]:
        page.locator('.tictactoe-cell[data-cell="' + str(cell) + '"]').click()
    check("X wins" in page.locator(".tic-status").inner_text(), "Two players can finish through actual controls")
    check(
        any(record["type"] == "tictactoe" for record in page.evaluate("() => AlibiClub.diagnostics().state.records")),
        "Completed Tic-Tac-Toe enters the local Club journal",
    )
    action("club-undo", '[data-id="tictactoe"]')
    check("X wins" not in page.locator(".tic-status").inner_text(), "Undo reopens a finished local match")
    action("club-redo", '[data-id="tictactoe"]')
    check("X wins" in page.locator(".tic-status").inner_text(), "Redo restores the finished local match")
    if os.environ.get('ALIBI_URL'):
        page.wait_for_timeout(600)
        context.set_offline(True)
        page.reload()
        page.wait_for_selector('.tic-status')
        check('X wins' in page.locator('.tic-status').inner_text(), 'Finished match persists through real-origin offline reload')
    for width in (390, 1440):
        page.set_viewport_size({'width': width, 'height': 900})
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Tic-Tac-Toe fits {width}px')
        page.locator('.tic-panel').screenshot(path=str(OUT/f'board-{width}.png'))
    route("/home")
    check(
        page.locator('.club-gamecard[data-id="tictactoe"]').count() == 1,
        "Home advertises a distinct Tic-Tac-Toe game card",
    )
    check(not errors, "Tic-Tac-Toe controls produce no unhandled browser errors")
    print("PASS", len(checks), "Tic-Tac-Toe browser assertions.")
    browser.close()
