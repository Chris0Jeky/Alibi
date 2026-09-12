"""House navigation contract. Source mode is explicit; it is NOT an origin/SW test."""
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("ALIBI_RESULTS", ROOT / "test-results" / "house"))
SOURCE = os.environ.get("ALIBI_HOUSE_SOURCE")
URL = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787").rstrip("/")
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []


def check(value, label):
    assert value, label
    checks.append(label)
    print("PASS", label, flush=True)


def nav(page, view):
    selector = ".hx-mobile" if page.viewport_size["width"] <= 760 else ".hx-nav"
    names = {"desk": "Your desk", "puzzles": "Puzzles", "house": "The house", "notebook": "Notebook", "comfort": "Comfort"}
    page.locator(selector).get_by_role("link", name=names[view], exact=True).click()
    page.wait_for_function("v => AlibiHouseModel.locationState(location.hash).view === v", arg=view)
    page.wait_for_timeout(80)


def fit(page, label):
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), label + " no horizontal page overflow")
    check(page.evaluate("""() => {const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size;}"""), label + " unique document IDs")


def main():
    with sync_playwright() as pw:
        options = {"headless": True, "args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            options["executable_path"] = os.environ["CHROMIUM_PATH"]
        elif Path("/usr/bin/chromium").exists():
            options["executable_path"] = "/usr/bin/chromium"
        browser = pw.chromium.launch(**options)
        for width in (390, 1440):
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            page = context.new_page()
            page.set_default_timeout(6000)
            page.on("pageerror", lambda e: errors.append(str(e)))
            if SOURCE:
                page.set_content(Path(SOURCE).read_text(), wait_until="load")
            else:
                page.goto(URL + "/#/home?ux=house")
            page.locator(".hx-experience").wait_for()
            check(page.locator("h1").inner_text() == "A light is still on.", f"{width}: house entry")
            fit(page, f"{width}: desk")
            page.screenshot(path=str(OUT / f"desk-{width}.png"), full_page=True)
            # A genuine first puzzle and a genuine edit; no injected completion or saved record.
            play = page.locator(".hx-resume [data-house-action=play]")
            play.click()
            page.locator("#dialog").get_by_role("button", name="Start playing", exact=True).click()
            page.locator("#cell-0").click()
            page.wait_for_function("AlibiDiagnostics.getCurrent().moves > 0")
            saved = page.evaluate("AlibiDiagnostics.getCurrent()")
            page.locator("#hx-return a").click()
            page.wait_for_timeout(120)
            expect(page.locator(".hx-resume")).to_contain_text("Continue puzzle")
            check(page.locator(".hx-resume").inner_text().find("1 move") >= 0, f"{width}: real run appears on desk")
            play = page.locator(".hx-resume [data-house-action=play]")
            play.click()
            page.wait_for_function("AlibiDiagnostics.getCurrent()?.key === 'binary-01@1'")
            check(page.evaluate("AlibiDiagnostics.getCurrent().state") == saved["state"], f"{width}: canonical board resumes")
            check(page.evaluate("AlibiDiagnostics.getCurrent().undo") == saved["undo"], f"{width}: undo history preserved")
            page.locator("#hx-return a").click()
            page.wait_for_timeout(120)
            # Filter URL, null results, recovery, pagination focus and return anchor.
            nav(page, "puzzles")
            page.locator("#hx-query").fill("zzzz-no-match")
            page.locator("#hx-search-form").get_by_role("button", name="Find puzzles").click()
            expect(page.locator(".hx-empty")).to_be_visible()
            check("q=zzzz-no-match" in page.evaluate("location.hash"), f"{width}: query encoded in URL")
            page.locator(".hx-empty a").click()
            expect(page.locator(".hx-puzzle")).to_have_count(12)
            page.locator("#hx-more").focus()
            page.keyboard.press("Enter")
            expect(page.locator(".hx-puzzle")).to_have_count(24)
            check(page.evaluate("document.activeElement.id") == "hx-more", f"{width}: pagination keyboard anchor")
            launch = page.locator(".hx-puzzle [data-house-action=play]").nth(17)
            origin_id = launch.get_attribute("id")
            browse_hash = page.evaluate("location.hash")
            launch.click()
            page.wait_for_timeout(100)
            if page.locator("#dialog").evaluate("e => e.open"):
                page.locator("#dialog").get_by_role("button", name="Start playing", exact=True).click()
            page.locator("#hx-return a").click()
            page.wait_for_timeout(160)
            check(page.evaluate("location.hash") == browse_hash, f"{width}: exact finder route restored")
            expect(page.locator(".hx-puzzle")).to_have_count(24)
            check(page.evaluate("document.activeElement.id") == origin_id, f"{width}: originating puzzle regains focus")
            # Mystery loop: keyboard accessible observations, native Escape, wrong/right answer.
            nav(page, "house")
            letter = page.locator(".hx-letter-strip [data-house-action=letter]")
            letter.focus()
            letter_id = letter.get_attribute("id")
            page.keyboard.press("Enter")
            expect(page.locator("#dialog")).to_be_visible()
            page.keyboard.press("Escape")
            page.wait_for_timeout(100)
            check(page.evaluate("document.activeElement.id") == letter_id, f"{width}: letter Escape restores opener")
            for room in ("study", "library", "maps"):
                item = page.locator(f".hx-room-cards [data-room={room}]")
                origin = item.get_attribute("id")
                item.click()
                expect(page.locator("#dialog")).to_be_visible()
                page.keyboard.press("Escape")
                page.wait_for_timeout(80)
                check(page.evaluate("document.activeElement.id") == origin, f"{width}: {room} close restores opener")
            check(page.evaluate("AlibiHouseLoader.diagnostics().study.study.visited.length") == 3, f"{width}: three observations")
            fit(page, f"{width}: map")
            page.screenshot(path=str(OUT / f"house-{width}.png"), full_page=True)
            nav(page, "notebook")
            page.locator("#hx-answer").select_option("library")
            page.locator("#hx-answer-form button").click()
            expect(page.locator(".hx-answer-feedback")).to_be_visible()
            check(page.evaluate("AlibiHouseLoader.diagnostics().study.study.visited.length") == 3, f"{width}: wrong answer keeps evidence")
            page.locator("[data-house-action=hint]").click()
            page.locator("[data-house-action=hint]").click()
            expect(page.locator("[data-house-action=hint]")).to_have_text("Reveal the explanation (spoiler)")
            check(not page.evaluate("AlibiHouseLoader.diagnostics().study.study.solved"), f"{width}: hints do not forge completion")
            page.locator("#hx-answer").select_option("maps")
            page.locator("#hx-answer-form button").click()
            expect(page.locator(".hx-success")).to_contain_text("Both details fit")
            check(page.evaluate("AlibiHouseLoader.diagnostics().study.study.solved"), f"{width}: real study deduction completes")
            page.screenshot(path=str(OUT / f"notebook-{width}.png"), full_page=True)
            # Shared preference owner, focus retention, narrow/large-text/forced-colour layout.
            nav(page, "comfort")
            page.locator("#theme-select").select_option("night")
            expect(page.locator("html")).to_have_attribute("data-theme", "night")
            page.locator("#hx-setting-largeText").check()
            expect(page.locator("html")).to_have_attribute("data-large", "true")
            page.locator("#hx-setting-contrast").check()
            expect(page.locator("html")).to_have_attribute("data-contrast", "true")
            check(page.locator("#hx-setting-reducedMotion").is_checked(), f"{width}: system reduced motion respected")
            fit(page, f"{width}: comfort large text")
            page.screenshot(path=str(OUT / f"comfort-{width}.png"), full_page=True)
            for narrow in (320, 360, 768):
                page.set_viewport_size({"width": narrow, "height": 900})
                nav(page, "house")
                fit(page, f"{width}: map at {narrow}, large text")
                page.emulate_media(forced_colors="active")
                fit(page, f"{width}: forced colours at {narrow}")
                page.emulate_media(forced_colors="none")
            nav(page, "comfort")
            page.locator(".hx-exit").click()
            page.wait_for_timeout(120)
            check(page.locator(".hx-experience").count() == 0, f"{width}: classic exit")
            check(page.locator(".sidebar").count() == 1, f"{width}: original navigation retained")
            check(page.evaluate("document.body.dataset.house") == "false", f"{width}: house CSS deactivated")
            # Inspect canonical settings, not a duplicate house preference store.
            page.evaluate("location.hash = '#/settings'")
            page.locator("#theme-select").wait_for()
            check(page.locator("#theme-select").input_value() == "night", f"{width}: same settings in classic")
            context.close()
        check(not errors, "no JavaScript page errors: " + repr(errors))
        browser.close()
    receipt = {"mode": "source-set-content-no-origin" if SOURCE else "hosted-build", "checks": len(checks), "passed": checks, "errors": errors, "durabilityAndOfflineVerified": False}
    (OUT / "results.json").write_text(json.dumps(receipt, indent=2))
    print(json.dumps({"mode": receipt["mode"], "checks": len(checks)}))


if __name__ == "__main__":
    main()
