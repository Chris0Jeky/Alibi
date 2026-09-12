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
        if os.environ.get('ALIBI_URL'):
            page.goto(os.environ['ALIBI_URL'])
            page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        else:
            page.set_content((ROOT / "alibi-deluxe-play.html").read_text(encoding="utf-8"), wait_until="load")
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
        opening.focus()
        page.keyboard.press('Enter')
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
        check(page.locator('.domino-status').evaluate('e => e === document.activeElement'),
              f'Keyboard play returns focus to the updated round status at {width}px')
        page.keyboard.press('Tab')
        check(page.locator('.domino-hand-tile').first.evaluate('e => e === document.activeElement'),
              f'Tab from the round status reaches the remaining hand at {width}px')
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
        if os.environ.get('ALIBI_URL'):
            page.wait_for_timeout(600)
            context.set_offline(True)
            page.reload()
            page.wait_for_selector('.domino-chain-piece')
            check(page.evaluate('AlibiClub.diagnostics().state.runs.dominoes.log.length')==1, f'Round survives offline reload at {width}px')
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
        saw_pan = False
        for seed, winner, blocked in [
            ('OUTCOME-0', 'bot', True), ('OUTCOME-1', 'human', False),
            ('OUTCOME-3', 'bot', False), ('OUTCOME-6', 'human', True),
            ('OUTCOME-23', 'draw', True),
        ]:
            page.locator('#domino-seed').fill(seed)
            page.locator('[data-action="club-domino-use-seed"]').click()
            page.locator('[data-action="club-reset-confirm"]').click()
            for turn in range(100):
                move = page.evaluate('''() => {
                    const E = AlibiClubEngines.dominoes, r = AlibiClub.diagnostics().state.runs.dominoes;
                    const s = E.replay(r.seed, r.log), m = E.legalMoves(s)[0];
                    return s.done ? {done:true, winner:s.winner, blocked:!!(s.human.length && s.bot.length)}
                        : m ? {kind:'play', ...m} : {kind:s.stock.length ? 'draw' : 'pass'};
                }''')
                if move.get('done'):
                    check(move['winner'] == winner and move['blocked'] == blocked,
                          f'{seed} reaches the expected legal outcome at {width}px')
                    break
                if move['kind'] == 'play':
                    chain = page.locator('.domino-chain')
                    chain.evaluate('e => { e.scrollLeft = e.scrollWidth; }')
                    pan = chain.evaluate('e => e.scrollLeft')
                    tile = page.locator(f'[data-action="club-domino-tile"][data-value="{move["tile"]}"]')
                    tile.focus()
                    page.keyboard.press('Enter')
                    if pan > 0:
                        check(abs(chain.evaluate('e => e.scrollLeft') - pan) <= 1,
                              f'{seed} turn {turn}: selecting a tile keeps the chain pan at {width}px')
                        saw_pan = True
                    page.locator(f'[data-action="club-domino-end"][data-value="{move["end"]}"]').focus()
                else:
                    page.locator(f'[data-action="club-domino-{move["kind"]}"]').focus()
                page.keyboard.press('Enter')
                check(page.locator('.domino-status').evaluate('e => e === document.activeElement'),
                      f'{seed} turn {turn}: keyboard action retains round context at {width}px')
            else:
                raise AssertionError(f'{seed} did not finish within 100 legal actions')
            outcome = page.locator('.domino-status').inner_text()
            if blocked:
                check('blocked' in outcome and 'empty' not in outcome,
                      f'{seed} describes a blocked round accurately at {width}px')
                check(('Equal pips' if winner == 'draw' else 'fewer pips') in outcome,
                      f'{seed} explains the pip outcome at {width}px')
            else:
                check('empt' in outcome and 'blocked' not in outcome,
                      f'{seed} describes an emptied hand accurately at {width}px')
        if width == 390:
            check(saw_pan, 'Phone play exercises an overflowing domino chain')
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
