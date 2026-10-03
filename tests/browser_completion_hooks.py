"""Completion hook failures must preserve actual controls, dialog and IndexedDB saves."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_origin import boot, route, current, wait_diag, dismiss_dialog

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "completion-hooks"
OUT.mkdir(parents=True, exist_ok=True)
PUZZLE = next(p for p in json.loads((ROOT / "content/catalog.json").read_text())["puzzles"]
              if p["id"] == "sudoku-01")
PAINT_PUZZLE = next(p for p in json.loads((ROOT / "content/catalog.json").read_text())["puzzles"]
                    if p["id"] == "nonogram-01")


def read_saved_run(page, key):
    return page.evaluate("""(key) => new Promise((resolve, reject) => {
      let db, settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        db?.close();
        if (error) reject(error);
        else resolve(value ?? null);
      };
      const timer = setTimeout(() => finish(Error('completed save read timeout')), 3000);
      const request = indexedDB.open('alibi-device');
      request.onerror = () => finish(request.error || Error('completed save open failed'));
      request.onsuccess = () => {
        db = request.result;
        if (settled) { db.close(); return; }
        try {
          const read = db.transaction('runs', 'readonly').objectStore('runs').get(key);
          read.onerror = () => finish(read.error || Error('completed save read failed'));
          read.onsuccess = () => finish(null, read.result?.value);
        } catch (error) { finish(error); }
      };
    })""", key)


def failure_diagnostics(page, key, errors, identity):
    evidence = {"platformBuild": identity, "pageerrors": [e[:1000] for e in errors[-10:]]}
    try:
        evidence.update(page.evaluate("""async (key) => {
          const snapshot = (run) => run ? {
            key: run.key, state: run.state, moves: run.moves,
            completedAt: run.completedAt, firstCompletedAt: run.firstCompletedAt
          } : null;
          const stored = await new Promise((resolve) => {
            let db, settled = false;
            const finish = (value) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              db?.close();
              resolve(value);
            };
            const timer = setTimeout(() => finish({error: 'diagnostic read timeout'}), 1000);
            const request = indexedDB.open('alibi-device');
            request.onerror = () => finish({error: 'diagnostic database open failed'});
            request.onsuccess = () => {
              db = request.result;
              if (settled) { db.close(); return; }
              try {
                const read = db.transaction('runs', 'readonly').objectStore('runs').get(key);
                read.onerror = () => finish({error: 'diagnostic snapshot read failed'});
                read.onsuccess = () => finish(snapshot(read.result?.value));
              } catch { finish({error: 'diagnostic runs unavailable'}); }
            };
          });
          return {
            current: snapshot(globalThis.AlibiDiagnostics?.getCurrent()), stored,
            hookAttempts: globalThis.completionHookAttempts ?? null,
            ordinaryJourneyAttempts: globalThis.ordinaryJourneyAttempts ?? null
          };
        }""", key))
    except Exception as error:
        evidence["diagnosticError"] = str(error)[:1000]
    return evidence


def main():
    results = []
    cases = []
    for width in (390, 1440):
        for journey, theatre in ((True, False), (False, True), (True, True), (False, False)):
            cases.append((f"{width}-journey-{int(journey)}-theatre-{int(theatre)}",
                          width, journey, theatre, False, PUZZLE))
        cases.append((f"{width}-commit-all", width, True, False, True, PUZZLE))
        cases.append((f"{width}-paint-all", width, True, False, True, PAINT_PUZZLE))
    selector = os.environ.get("ALIBI_COMPLETION_CASE")
    if selector is not None:
        selected = [case for case in cases if case[0] == selector]
        if not selected:
            raise ValueError(f"Unknown ALIBI_COMPLETION_CASE {selector!r}; expected one of "
                             + ", ".join(case[0] for case in cases))
        cases = selected
    with sync_playwright() as pw:
        launch = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch["executable_path"] = os.environ["CHROMIUM_PATH"]
        for name, width, journey, theatre, always, puzzle in cases:
            key = f'{puzzle["id"]}@{puzzle["revision"]}'
            with tempfile.TemporaryDirectory(prefix="profile-", dir=OUT) as profile:
                context = pw.chromium.launch_persistent_context(
                    profile, viewport={"width": width, "height": 900},
                    reduced_motion="reduce", **launch)
                page = None
                errors = []
                identity = None
                try:
                    page = context.new_page()
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.set_default_timeout(10000)
                    boot(page)
                    identity = page.evaluate("globalThis.ALIBI_PLATFORM_BUILD ?? null")
                    route(page, f"play/{key}")
                    dismiss_dialog(page)
                    page.evaluate("""({journey, theatre, always}) => {
                      const originalJourney = globalThis.AlibiJourney;
                      const originalMoment = globalThis.AlibiTheatre.moment;
                      globalThis.completionHookAttempts = {journey: 0, theatre: 0};
                      globalThis.ordinaryJourneyAttempts = 0;
                      globalThis.AlibiJourney = (...args) => {
                        if (args[1] === 'puzzle.completed') {
                          completionHookAttempts.journey++;
                        } else if (always) {
                          ordinaryJourneyAttempts++;
                        }
                        if (always) throw Error('fixture every Journey invocation');
                        if (args[1] === 'puzzle.completed' && journey)
                          throw Error('fixture completion Journey');
                        return originalJourney?.(...args);
                      };
                      globalThis.AlibiTheatre.moment = function (...args) {
                        if (args[0] === 'complete') {
                          completionHookAttempts.theatre++;
                          if (theatre) throw Error('fixture completion Theatre');
                        }
                        return originalMoment.apply(this, args);
                      };
                    }""", {"journey": journey, "theatre": theatre, "always": always})
                    moves = current(page)["moves"]
                    for cell, value in enumerate(puzzle["solution"]):
                        if puzzle["type"] == "nonogram":
                            if value != 1:
                                continue
                            # A real click delivers pointerdown/paintTo and pointerup/endPaint.
                            page.locator(f'.paint-cell[data-cell="{cell}"]').click()
                        elif not puzzle["givens"][cell]:
                            page.locator(f'[data-action="cell"][data-cell="{cell}"]').click()
                            page.locator(f'[data-action="value"][data-value="{value}"]').click()
                        else:
                            continue
                        moves += 1
                        page.wait_for_function("""({cell, value, moves}) => {
                          const run = AlibiDiagnostics.getCurrent();
                          return run?.state.cells[cell] === value && run.moves === moves;
                        }""", arg={"cell": cell, "value": value, "moves": moves}, timeout=2000)
                        if always:
                            assert page.evaluate("ordinaryJourneyAttempts") > 0, name
                    page.wait_for_function("() => AlibiDiagnostics.getCurrent()?.completedAt && !AlibiDiagnostics.getStatus().pendingSaves")
                    completed = current(page)
                    if puzzle["type"] == "nonogram":
                        assert [value == 1 for value in completed["state"]["cells"]] == [
                            value == 1 for value in puzzle["solution"]], name
                    else:
                        assert completed["state"]["cells"] == puzzle["solution"], name
                    assert completed["firstCompletedAt"] == completed["completedAt"], name
                    assert page.evaluate("completionHookAttempts") == {"journey": 1, "theatre": 1}, name
                    assert page.locator("dialog[open]").count() == 1, name
                    assert "Every constraint is satisfied" in page.locator("dialog[open]").inner_text(), name
                    assert not page.evaluate("AlibiDiagnostics.getStatus().saveError"), name
                    stored = read_saved_run(page, key)
                    assert stored["completedAt"] == completed["completedAt"], name
                    assert stored["firstCompletedAt"] == completed["firstCompletedAt"], name
                    assert stored["state"] == completed["state"], name
                    if journey and theatre:
                        page.screenshot(path=str(OUT / f"complete-{width}.png"), full_page=True)
                    if always:
                        page.screenshot(path=str(OUT / f"complete-{name}.png"), full_page=True)
                    dismiss_dialog(page)
                    page.reload(wait_until="domcontentloaded")
                    wait_diag(page)
                    restored = current(page)
                    assert restored["completedAt"] == completed["completedAt"], name
                    assert restored["firstCompletedAt"] == completed["firstCompletedAt"], name
                    assert restored["state"] == completed["state"], name
                    assert not errors, errors
                    results.append({"case": name, "completedAt": completed["completedAt"],
                                    "saved": True, "platformBuild": identity})
                    print(f"PASS {name}: controls, both hooks, completion dialog, saved snapshot and reload", flush=True)
                except Exception as error:
                    evidence = {"case": name, "key": key, "saved": False, "error": str(error)[:2000],
                                **failure_diagnostics(page, key, errors, identity)}
                    (OUT / f"failure-{name}.json").write_text(json.dumps(evidence, indent=2) + "\n")
                    (OUT / "results.json").write_text(json.dumps([*results, evidence], indent=2) + "\n")
                    print(f"FAIL {name}: {json.dumps(evidence)}", flush=True)
                    raise
                finally:
                    context.close()
    (OUT / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print(f"{len(results)} completion hook browser cases passed", flush=True)


if __name__ == "__main__":
    main()
