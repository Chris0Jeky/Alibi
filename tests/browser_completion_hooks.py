"""Completion hook failures must preserve actual controls, dialog and IndexedDB saves."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_origin import boot, route, current, read_idb, wait_diag, dismiss_dialog

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "completion-hooks"
OUT.mkdir(parents=True, exist_ok=True)
PUZZLE = next(p for p in json.loads((ROOT / "content/catalog.json").read_text())["puzzles"]
              if p["id"] == "sudoku-01")


def main():
    results = []
    with sync_playwright() as pw:
        launch = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch["executable_path"] = os.environ["CHROMIUM_PATH"]
        browser = pw.chromium.launch(**launch)
        try:
            for width in (390, 1440):
                for journey, theatre in ((True, False), (False, True), (True, True), (False, False)):
                    name = f"{width}-journey-{int(journey)}-theatre-{int(theatre)}"
                    with tempfile.TemporaryDirectory(prefix="profile-", dir=OUT) as profile:
                        context = pw.chromium.launch_persistent_context(
                            profile, viewport={"width": width, "height": 900},
                            reduced_motion="reduce", **launch)
                        try:
                            page = context.new_page()
                            errors = []
                            page.on("pageerror", lambda error: errors.append(str(error)))
                            page.set_default_timeout(10000)
                            boot(page)
                            route(page, "play/sudoku-01@1")
                            dismiss_dialog(page)
                            page.evaluate("""({journey, theatre}) => {
                              const originalJourney = globalThis.AlibiJourney;
                              const originalMoment = globalThis.AlibiTheatre.moment;
                              globalThis.completionHookAttempts = {journey: 0, theatre: 0};
                              globalThis.AlibiJourney = (...args) => {
                                if (args[1] === 'puzzle.completed') {
                                  completionHookAttempts.journey++;
                                  if (journey) throw Error('fixture completion Journey');
                                }
                                return originalJourney?.(...args);
                              };
                              globalThis.AlibiTheatre.moment = function (...args) {
                                if (args[0] === 'complete') {
                                  completionHookAttempts.theatre++;
                                  if (theatre) throw Error('fixture completion Theatre');
                                }
                                return originalMoment.apply(this, args);
                              };
                            }""", {"journey": journey, "theatre": theatre})
                            for cell, value in enumerate(PUZZLE["solution"]):
                                if not PUZZLE["givens"][cell]:
                                    page.locator(f'[data-action="cell"][data-cell="{cell}"]').click()
                                    page.locator(f'[data-action="value"][data-value="{value}"]').click()
                            page.wait_for_function("AlibiDiagnostics.getCurrent()?.completedAt && !AlibiDiagnostics.getStatus().pendingSaves")
                            completed = current(page)
                            assert completed["state"]["cells"] == PUZZLE["solution"], name
                            assert completed["firstCompletedAt"] == completed["completedAt"], name
                            assert page.evaluate("completionHookAttempts") == {"journey": 1, "theatre": 1}, name
                            assert page.locator("dialog[open]").count() == 1, name
                            assert "Every constraint is satisfied" in page.locator("dialog[open]").inner_text(), name
                            assert not page.evaluate("AlibiDiagnostics.getStatus().saveError"), name
                            stored = read_idb(page, "runs", "sudoku-01@1")
                            assert stored["completedAt"] == completed["completedAt"], name
                            assert stored["firstCompletedAt"] == completed["firstCompletedAt"], name
                            assert stored["state"] == completed["state"], name
                            if journey and theatre:
                                page.screenshot(path=str(OUT / f"complete-{width}.png"), full_page=True)
                            dismiss_dialog(page)
                            page.reload(wait_until="domcontentloaded")
                            wait_diag(page)
                            restored = current(page)
                            assert restored["completedAt"] == completed["completedAt"], name
                            assert restored["firstCompletedAt"] == completed["firstCompletedAt"], name
                            assert restored["state"] == completed["state"], name
                            assert not errors, errors
                            results.append({"case": name, "completedAt": completed["completedAt"], "saved": True})
                            print(f"PASS {name}: controls, both hooks, completion dialog, saved snapshot and reload", flush=True)
                        finally:
                            context.close()
        finally:
            browser.close()
    (OUT / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print(f"{len(results)} completion hook browser cases passed", flush=True)


if __name__ == "__main__":
    main()
