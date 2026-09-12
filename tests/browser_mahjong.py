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
        check(page.locator('.mahjong-tile').first.bounding_box()['width'] >= 44, f'Mahjong tiles retain touch width at {width}px')
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Mahjong has no page overflow at {width}px')
        page.screenshot(path=str(ROOT/'test-results'/f'mahjong-play-{width}.png'),full_page=True)
        page.locator(".mahjong-tile.free").first.click()
        check(
            page.locator('.mahjong-tile[aria-pressed="true"]').count() == 1,
            f"Selecting a free tile exposes its active state at {width}px",
        )
        check(
            page.locator(".mahjong-tile.match-target").count() == 1,
            f"Selecting a tile highlights its matching pair at {width}px",
        )
        page.locator(".mahjong-tile.match-target").focus()
        page.keyboard.press('Enter')
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.mahjong.log.length === 1"
        )
        check(
            page.locator(".mahjong-tile").count() == 18,
            f"A matching pair clears through an actual tile tap at {width}px",
        )
        check(page.locator('.mahjong-tile.free').first.evaluate('e => e === document.activeElement'),
              f'Keyboard pair removal focuses a surviving free tile at {width}px')
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
        route("/salon/blockcabinet")
        page.locator('[data-action="club-block-piece"]').first.click()
        page.locator(".block-cell.legal-origin").first.click()
        page.wait_for_function(
            "() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length === 1"
        )
        check(
            page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet.log.length") == 1,
            f"Another Club run is saved before Mahjong completion at {width}px",
        )
        route("/salon/mahjong")
        page.locator('.mahjong-tile.free').first.click()
        route('/home')
        route('/salon/mahjong')
        check(page.locator('.mahjong-tile[aria-pressed="true"]').count() == 0,
              f'An unrelated route clears the transient tile selection at {width}px')
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
        for _ in range(10):
            free = page.locator('.mahjong-tile.free')
            faces = free.all_inner_texts()
            face = next((face for face in faces if faces.count(face)==2), None)
            check(face is not None, f'A free matching pair remains at {width}px')
            free.nth(faces.index(face)).click()
            page.locator('.mahjong-tile.match-target').click()
        check(page.locator('.mahjong-tile').count()==0, f'All ten pairs clear through controls at {width}px')
        check('Every pair is clear' in page.locator('.mahjong-status').inner_text(), f'Completion is visible at {width}px')
        check(page.locator('.mahjong-status').evaluate('e => e === document.activeElement'),
              f'The final removed pair moves focus to completion status at {width}px')
        if os.environ.get("ALIBI_URL"):
            page.evaluate("() => AlibiClub.save()")
            context.set_offline(True)
            page.reload()
            page.wait_for_selector(".mahjong-status")
            page.wait_for_function(
                "() => { const d = AlibiClub.diagnostics(); return d.saveError || d.state.runs.mahjong?.log?.length === 10; }"
            )
            check(
                page.evaluate("() => AlibiClub.diagnostics().state.runs.mahjong?.log?.length") == 10,
                f"Completed Mahjong replay survives an offline reload at {width}px",
            )
            check(
                page.evaluate("() => { const r = AlibiClub.diagnostics().state.records.find((x) => x.type === 'mahjong'); return r?.score === 100 && Number.isFinite(r.score); }"),
                f"Completed Mahjong record has a finite 100-point score after reload at {width}px",
            )
            check(
                page.evaluate("() => AlibiClub.diagnostics().state.runs.blockcabinet?.log?.length === 1"),
                f"Another Club run remains after the Mahjong completion reload at {width}px",
            )
            check(
                page.evaluate("() => { const d = AlibiClub.diagnostics(); return d.storageMode === 'indexeddb' && !d.saveError; }"),
                f"Club save remains available after completed Mahjong reload at {width}px",
            )
            check(
                page.evaluate("async () => { try { await AlibiClub.validateBackup(AlibiClub.diagnostics().state); return true; } catch { return false; } }"),
                f"Reloaded Club state passes save validation at {width}px",
            )
        page.locator('[data-action="club-undo"][data-id="mahjong"]').click()
        check(page.locator('.mahjong-tile').count()==2, f'Undo reopens completed table at {width}px')
        page.locator('[data-action="club-redo"][data-id="mahjong"]').click()
        check(page.locator('.mahjong-tile').count()==0, f'Redo completes table at {width}px')
        route('/salon')
        check(page.locator('.club-gamecard').count()==9, f'Games Room index preserves eight games and atlas at {width}px')
        check(page.locator('.club-gamecard[data-id="mahjong"]').count()==1, f'Games Room includes Mahjong at {width}px')
        check(not errors, f"Mahjong controls produce no browser errors at {width}px")
        context.close()
    print("PASS", len(checks), "Mahjong browser assertions.")
    browser.close()
