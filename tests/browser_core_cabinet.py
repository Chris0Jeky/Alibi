"""Core-cabinet regressions from the 0.14.1 browser audit, through real controls.

Covers library filters across families (M2, m4, m5), the crime-scene conclusion at 390px
(M3, m10, m9, p2), casebook chapter completion (M5, m24), journal links (M1 partial, m12),
touch versus keyboard copy (m8), the desk news count (m1), the issue report copy (m21) and
witness plurals (p1). Each check is recorded; the run fails at the end with every miss, so
a baseline build lists all regressions at once. Simulated viewports, not a physical device.

    npm start                      # serves dist/ on http://127.0.0.1:8787
    PYTHONUTF8=1 py -3 tests/browser_core_cabinet.py
"""
import json
import os
import re
from pathlib import Path

from official_fixture import official_puzzles, official_venue_count
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787").rstrip("/")
OUT = Path(os.environ.get("ALIBI_RESULTS", str(ROOT / "test-results" / "core-cabinet")))
OUT.mkdir(parents=True, exist_ok=True)
PUZZLES = {p["id"]: p for p in official_puzzles()}
BOOKS = json.loads((ROOT / "content/casebooks.json").read_text(encoding="utf-8"))
BELLWEATHER = next(b for b in BOOKS if b["id"] == "last-light-at-bellweather")
SUN_AND_MOON = sum(p["type"] == "binary" for p in PUZZLES.values())
SALT_COUNT = official_venue_count("salt")
passed: list[str] = []
failed: list[str] = []
errors: list[str] = []


def check(value, label):
    (passed if value else failed).append(label)
    print(("PASS " if value else "FAIL ") + label, flush=True)


def dismiss(page):
    page.wait_for_timeout(250)
    if page.locator("dialog[open]").count():
        page.locator('dialog[open] [data-action="close-dialog"]').first.click()
        page.wait_for_timeout(120)


def go(page, path):
    dismiss(page)
    page.evaluate("(p) => { location.hash = '#/' + p }", path)
    page.wait_for_timeout(300)


def play(page, key):
    go(page, "play/" + key)
    page.wait_for_function(
        "(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=key.split("@")[0]
    )
    dismiss(page)


def meta(page):
    return page.locator("#library-filter-status span").first.inner_text()


def culprit(p):
    room = p["rooms"][p["solution"][p["victim"]]]
    return next(
        x["id"]
        for x in p["people"]
        if x["id"] != p["victim"] and p["rooms"][p["solution"][x["id"]]] == room
    )


def in_view(page, selector):
    return page.evaluate(
        """(s) => { const e = document.querySelector(s); if (!e) return false;
        const r = e.getBoundingClientRect(), nav = document.querySelector('.mobile-nav');
        const bottom = nav && nav.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
        return r.top >= 0 && r.top < bottom - 40; }""",
        selector,
    )


def library_checks(page, width, sidebar):
    go(page, "library/sudoku")
    page.locator("#difficulty-filter").select_option("Expert")
    page.locator("#status-filter").select_option("solved")
    check(meta(page) == "0 puzzles", f"{width}: empty result names only its count (m5)")
    check(
        page.locator("#library-clear-filters").inner_text().strip()
        == page.locator("#library-reset-filters").inner_text().strip(),
        f"{width}: both reset controls share one label (m5)",
    )
    check(
        "difficulty" in page.locator(".empty p").inner_text(),
        f"{width}: family empty state names filters that exist on the page (m5)",
    )
    if sidebar:
        page.locator('.sidebar .nav-types [data-id="lightup"]').click()
    else:
        go(page, "library/lightup")
    expect(page.locator(".page-head h1")).to_have_text("Lanterns.")
    check(
        page.locator("#difficulty-filter").input_value() == "all"
        and page.locator("#status-filter").input_value() == "all",
        f"{width}: Sudoku filters do not follow into Lanterns (M2)",
    )
    lanterns = sum(p["type"] == "lightup" for p in PUZZLES.values())
    check(meta(page).startswith(f"{lanterns} puzzles"), f"{width}: Lanterns lists every lantern puzzle (M2)")
    # Clearing filters from Browse all keeps the list and the chosen collection (m4).
    go(page, "library")
    page.locator('[data-action="browse-all"]').click()
    page.locator(".curation-collections > summary").click()
    page.locator('.curation-collections [data-action="curation-venue"][data-value="salt"]').click()
    page.locator("#library-search").fill("no-match-zzzz")
    expect(page.locator(".empty")).to_be_visible()
    page.locator("#library-clear-filters").click()
    page.wait_for_timeout(200)
    check(
        page.locator('[data-action="browse-all"]').count() == 0
        and meta(page).startswith(f"{SALT_COUNT} puzzles"),
        f"{width}: Reset filters keeps Browse all and its collection (m4)",
    )
    page.screenshot(path=str(OUT / f"library-reset-{width}.png"))


def scene_checks(page, width):
    p = PUZZLES["scene-01"]
    play(page, "scene-01@1")
    for person in p["people"]:
        page.locator(f'[data-action="person"][data-id="{person["id"]}"]').click()
        page.locator(f'[data-action="cell"][data-cell="{p["solution"][person["id"]]}"]').click()
    page.wait_for_timeout(200)
    banner = page.locator(".board-instruction").inner_text()
    check("final question" in banner, f"{width}: complete scene banner points to the conclusion (M3): {banner!r}")
    check(in_view(page, ".accusation"), f"{width}: completing the board brings the accusation into view (M3)")
    page.screenshot(path=str(OUT / f"scene-ready-{width}.png"))
    right = culprit(p)
    wrong = next(x["id"] for x in p["people"] if x["id"] not in (right, p["victim"]))
    page.locator(f'[data-action="choose-accuse"][data-id="{wrong}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    page.wait_for_timeout(200)
    feedback = page.locator(".feedback")
    check(
        feedback.count() == 1
        and "error" in (feedback.get_attribute("class") or "")
        and "not alone" in feedback.inner_text(),
        f"{width}: a wrong accusation says so explicitly (m10)",
    )
    page.screenshot(path=str(OUT / f"scene-wrong-{width}.png"))
    page.locator(f'[data-action="choose-accuse"][data-id="{right}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    expect(page.locator("dialog[open]")).to_be_visible()
    check(
        page.locator('dialog[open] a[href="#/journal"]').count() == 1,
        f"{width}: “Saved in your journal” links to the journal (M1)",
    )
    page.screenshot(path=str(OUT / f"scene-complete-{width}.png"))
    dismiss(page)
    check(
        "Another crime scene puzzle" in page.locator(".play-end").inner_text(),
        f"{width}: follow-up names a crime scene puzzle in the singular (p2)",
    )
    page.locator('.main-tools [data-action="hint"]').click()
    page.wait_for_timeout(200)
    check(
        page.locator('dialog[open] [data-action="reveal-confirm"]').count() == 0,
        f"{width}: Hint on a solved board offers nothing to reveal (m9)",
    )
    dismiss(page)


def witness_plural(page, width):
    p = PUZZLES["witness-01"]
    play(page, "witness-01@1")
    page.locator(f'[data-action="choose-accuse"][data-id="{p["solution"]}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    expect(page.locator("dialog[open]")).to_be_visible()
    text = page.locator("dialog[open]").inner_text()
    check(
        "1 statements" not in text and "1 statement" in text,
        f"{width}: one true statement is singular (p1)",
    )
    dismiss(page)


def casebook_checks(page, width, phone):
    first = BELLWEATHER["chapters"][0]
    p = PUZZLES[first["id"]]
    go(page, f"casebooks/{BELLWEATHER['id']}")
    page.locator('.chapter[data-action="open"]').first.click()
    page.get_by_role("button", name="Continue to puzzle", exact=True).click()
    page.wait_for_function("(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=p["id"])
    dismiss(page)
    if phone:
        check(
            "Casebook" in page.locator('.play-nav [data-action="back-to-collection"]').inner_text(),
            f"{width}: the casebook play bar says Casebook (m24)",
        )
    page.locator(f'[data-action="choose-accuse"][data-id="{p["solution"]}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    expect(page.locator("dialog[open]")).to_be_visible()
    title = page.locator("#dialog-title").inner_text()
    text = page.locator("dialog[open]").inner_text()
    check(title == "Chapter 1 of 6 complete.", f"{width}: chapter-aware completion title (M5): {title!r}")
    check("Case closed" not in text, f"{width}: an early chapter does not close the case (M5)")
    check(text.count(first["revelation"]) == 1, f"{width}: the revelation appears once in the dialog (M5)")
    page.screenshot(path=str(OUT / f"bellweather-ch1-{width}.png"))
    page.locator('dialog[open] [data-action="next"]').click()
    page.wait_for_selector(".story-page")
    story = page.locator(".story-page").inner_text()
    second = BELLWEATHER["chapters"][1]
    check(
        "CHAPTER 2 OF 6" in story and second["brief"] in story,
        f"{width}: next opens chapter 2 (M5)",
    )
    check(first["revelation"] not in story, f"{width}: the chapter 1 revelation is not repeated (M5)")
    page.screenshot(path=str(OUT / f"bellweather-next-{width}.png"))


def journal_checks(page, width):
    go(page, "journal")
    check(page.locator(".stat-card strong").first.inner_text() != "0", f"{width}: journal counts solved puzzles")
    check(
        "A fresh page" not in page.locator("#main").inner_text(),
        f"{width}: no fresh-page copy once puzzles are solved (m12)",
    )
    check(page.locator('#main a[href="#/club"]').count() >= 1, f"{width}: Your journal links to the Club journal (M1)")
    page.screenshot(path=str(OUT / f"journal-{width}.png"))
    go(page, "club")
    check(page.locator('#main a[href="#/journal"]').count() >= 1, f"{width}: Club journal links back to Your journal (M1)")


def home_checks(page, width):
    go(page, "home")
    news = page.locator(".news-features").inner_text()
    check(f"Explore all {SUN_AND_MOON} puzzles" in news, f"{width}: desk news counts Sun & Moon from the catalogue (m1)")
    page.locator('[data-action="feedback-report"]').first.click()
    text = page.locator("dialog[open]").inner_text()
    check(
        "stored solution" not in text and "board state" not in text,
        f"{width}: report copy without an open puzzle matches its export (m21)",
    )
    dismiss(page)


def touch_copy(page, width, touch):
    play(page, "network-01@1")
    board = page.locator(".board-column").inner_text()
    if touch:
        check(
            not re.search(r"Right-click|Shift\+Enter|Arrows? move", board),
            f"{width}: touch network copy has no mouse or keyboard instructions (m8)",
        )
        check(board.count("clockwise") == 1, f"{width}: the network instruction appears once (m8)")
        page.screenshot(path=str(OUT / f"network-touch-{width}.png"))
        play(page, "sudoku-01@1")
        check("Keyboard:" not in page.locator(".board-column").inner_text(), f"{width}: touch Sudoku hides keyboard copy (m8)")
    else:
        check("Shift+Enter" in board, f"{width}: desktop network copy keeps its keyboard help (m8)")


def run():
    with sync_playwright() as pw:
        launch = {"headless": True, "args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch["executable_path"] = os.environ["CHROMIUM_PATH"]
        elif Path("/usr/bin/chromium").exists():
            launch["executable_path"] = "/usr/bin/chromium"
        browser = pw.chromium.launch(**launch)
        try:
            for width, touch in ((390, True), (1280, False)):
                options = {"viewport": {"width": width, "height": 844 if touch else 800}, "reduced_motion": "reduce"}
                if touch:
                    options.update(has_touch=True, is_mobile=True)
                context = browser.new_context(**options)
                context.route("**/assets/pulseboard.*.js", lambda route: route.abort())
                page = context.new_page()
                page.set_default_timeout(8000)
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(URL + "/#/home")
                page.wait_for_function("() => Boolean(window.AlibiDiagnostics)")
                for section in (
                    lambda: library_checks(page, width, sidebar=not touch),
                    lambda: scene_checks(page, width),
                    lambda: witness_plural(page, width),
                    lambda: casebook_checks(page, width, phone=touch),
                    lambda: journal_checks(page, width),
                    lambda: home_checks(page, width),
                    lambda: touch_copy(page, width, touch),
                ):
                    try:
                        section()
                    except Exception as error:  # a broken section is a failure, not a stop
                        check(False, f"{width}: section raised {type(error).__name__}: {error}")
                context.close()
        finally:
            browser.close()
    check(not errors, f"no page errors {errors[:3]}")
    receipt = {"passed": not failed, "checks": passed, "failed": failed, "url": URL,
               "scope": "real Chromium controls, simulated 390px touch and 1280px desktop; not a physical device"}
    (OUT / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(f"{len(passed)} passed, {len(failed)} failed", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(run())
