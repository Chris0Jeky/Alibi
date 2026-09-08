"""Full expedition acceptance proposal for the Bridges and Bellweather wave.

The file is intended to live at ``tests/browser_expedition.py`` after integration.
It uses one fresh persistent Chromium profile at a 390px viewport, then changes
only the viewport for the requested laptop screenshot. It deliberately has no
focused-test switch: every run exercises all eight Bridges puzzles, all six
Bellweather chapters, persistence, keyboard controls and offline reload.
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from playwright.sync_api import BrowserContext, Error as PlaywrightError, Page, sync_playwright


ROOT = Path(os.environ.get("ALIBI_ROOT", Path(__file__).resolve().parents[1])).resolve()
BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/")
BASE = BASE if BASE.endswith("/") else BASE + "/"
RESULTS = Path(os.environ.get("ALIBI_RESULTS", ROOT / "test-results" / "browser-expedition")).resolve()
CHROMIUM_PATH = os.environ.get("CHROMIUM_PATH")
TIMEOUT_MS = int(os.environ.get("ALIBI_TIMEOUT_MS", "12000"))
SW_TIMEOUT_MS = int(os.environ.get("ALIBI_SW_TIMEOUT_MS", "45000"))

BRIDGE_IDS = [f"bridges-{i:02d}" for i in range(1, 9)]
BELLWEATHER_ID = "last-light-at-bellweather"
BELLWEATHER_IDS = [
    "bellweather-witness-03",
    "bellweather-witness-01",
    "bellweather-dossier-01",
    "bellweather-scene-01",
    "bellweather-witness-02",
    "bellweather-dossier-02",
]

checks: list[str] = []
errors: list[dict[str, str]] = []
console_errors: list[dict[str, str]] = []
runtime: dict[str, Any] = {}
catalog: dict[str, dict[str, Any]] = {}
casebook: dict[str, Any] = {}
scenario_name = "boot"
started = time.monotonic()


def check(value: Any, label: str) -> None:
    if not value:
        raise AssertionError(label)
    checks.append(label)
    print(f"PASS {label}", flush=True)


def set_scenario(name: str) -> None:
    global scenario_name
    scenario_name = name


def watch_page(page: Page) -> None:
    page.on(
        "pageerror",
        lambda error: errors.append(
            {"scenario": scenario_name, "kind": "pageerror", "message": str(error)}
        ),
    )
    page.on(
        "console",
        lambda message: console_errors.append(
            {"scenario": scenario_name, "kind": message.type, "message": message.text}
        )
        if message.type == "error"
        else None,
    )


def launch(pw: Any, profile: Path) -> BrowserContext:
    options: dict[str, Any] = {
        "headless": True,
        "viewport": {"width": 390, "height": 900},
        "accept_downloads": True,
        "reduced_motion": "reduce",
        "service_workers": "allow",
        "args": ["--no-sandbox"],
    }
    if CHROMIUM_PATH:
        options["executable_path"] = CHROMIUM_PATH
    elif Path("/usr/bin/chromium").exists():
        options["executable_path"] = "/usr/bin/chromium"
    return pw.chromium.launch_persistent_context(str(profile), **options)


def wait_check(page: Page, expression: str, *, arg: Any = None, timeout: int = TIMEOUT_MS) -> None:
    # Poll from the test process: Playwright's in-page polling uses eval, blocked by our CSP.
    end = time.monotonic() + timeout / 1000
    while time.monotonic() < end:
        try:
            if page.evaluate(expression, arg):
                return
        except PlaywrightError as error:
            if "Execution context was destroyed" not in str(error):
                raise
        page.wait_for_timeout(60)
    raise AssertionError(f"Timed out waiting for {expression}")


def wait_diag(page: Page) -> None:
    wait_check(page, "Boolean(window.AlibiDiagnostics)", timeout=TIMEOUT_MS)
    page.wait_for_timeout(100)


def current(page: Page) -> dict[str, Any]:
    value = page.evaluate("AlibiDiagnostics.getCurrent()")
    if not value:
        raise AssertionError("AlibiDiagnostics has no current puzzle")
    return value


def state(page: Page) -> dict[str, Any]:
    return current(page)["state"]


def close_dialog(page: Page) -> None:
    dialog = page.locator("dialog[open]")
    if not dialog.count():
        return
    close = dialog.locator('[data-action="close-dialog"]')
    if close.count():
        close.first.click()
    else:
        page.keyboard.press("Escape")
    page.wait_for_timeout(100)


def route(page: Page, path: str) -> None:
    close_dialog(page)
    page.evaluate("path => { location.hash = '#/' + path; }", path)
    page.wait_for_timeout(150)
    if path.startswith("play/"):
        puzzle_id = path.split("/", 1)[1].split("@", 1)[0].split("?", 1)[0]
        wait_check(page,
            "id => window.AlibiDiagnostics?.getCurrent()?.puzzle.id === id",
            arg=puzzle_id,
            timeout=TIMEOUT_MS,
        )
    else:
        expected = path.split("?", 1)[0]
        wait_check(page,
            "path => location.hash.replace(/^#\\/?/, '').startsWith(path)",
            arg=expected,
            timeout=TIMEOUT_MS,
        )


def play(page: Page, puzzle_id: str, book: str | None = None) -> None:
    p = catalog[puzzle_id]
    suffix = f"?book={quote(book)}" if book else ""
    route(page, f"play/{puzzle_id}@{p['revision']}{suffix}")
    check(current(page)["puzzle"]["id"] == puzzle_id, f"opened {puzzle_id} from the live catalogue")


def boot(page: Page) -> None:
    set_scenario("boot")
    page.goto(BASE, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
    wait_diag(page)
    runtime.update(
        page.evaluate(
            """() => ({
              build: globalThis.ALIBI_CONFIG?.build,
              applicationVersion: globalThis.ALIBI_CONFIG?.version,
              userAgent: navigator.userAgent,
              counts: AlibiDiagnostics.getCounts(),
              puzzles: globalThis.ALIBI_CATALOG?.puzzles || [],
              casebooks: globalThis.ALIBI_CASEBOOKS || []
            })"""
        )
    )
    check(page.title().startswith("Alibi"), "application boots at the configured origin")
    counts = runtime["counts"]
    check(counts["puzzles"] >= 116, "catalogue includes the 14 expedition puzzles")
    check(counts["types"] >= 13, "catalogue exposes Bridges as a thirteenth engine")
    check(page.evaluate("AlibiDiagnostics.storage") == "indexeddb", "expedition uses IndexedDB storage")
    puzzles = runtime["puzzles"]
    check(isinstance(puzzles, list) and len(puzzles) >= 116, "live catalogue is readable once")
    catalog.update({p["id"]: p for p in puzzles if isinstance(p, dict) and "id" in p})
    expected = set(BRIDGE_IDS + BELLWEATHER_IDS)
    check(expected.issubset(catalog), "all Bridges and Bellweather IDs are in the live catalogue")
    books = runtime["casebooks"]
    match = next((b for b in books if b.get("id") == BELLWEATHER_ID), None)
    check(match is not None, "Bellweather casebook is in the live casebook catalogue")
    casebook.update(match or {})
    check([c.get("id") for c in casebook.get("chapters", [])] == BELLWEATHER_IDS, "Bellweather chapter order is stable")


def screenshot(page: Page, name: str) -> None:
    page.screenshot(path=str(RESULTS / f"{name}.png"), full_page=True)


def cells_for(p: dict[str, Any]) -> dict[int, int]:
    return {int(island["cell"]): i for i, island in enumerate(p["islands"])}


def bridge_edges(p: dict[str, Any]) -> list[tuple[int, int]]:
    points = [(island["cell"] % p["size"], island["cell"] // p["size"]) for island in p["islands"]]
    out: list[tuple[int, int]] = []
    for a, (x, y) in enumerate(points):
        horizontal = sorted(
            ((b, bx) for b, (bx, by) in enumerate(points) if by == y and bx > x),
            key=lambda pair: pair[1],
        )
        vertical = sorted(
            ((b, by) for b, (bx, by) in enumerate(points) if bx == x and by > y),
            key=lambda pair: pair[1],
        )
        if horizontal:
            out.append((a, horizontal[0][0]))
        if vertical:
            out.append((a, vertical[0][0]))
    return out


def bridge_click(page: Page, p: dict[str, Any], edge_index: int) -> None:
    a, b = bridge_edges(p)[edge_index]
    for index in (a, b):
        page.locator(f'[data-action="cell"][data-cell="{p["islands"][index]["cell"]}"]').click()


def wait_edge(page: Page, edge_index: int, value: int) -> None:
    wait_check(page,
        "({i, v}) => AlibiDiagnostics.getCurrent()?.state.cells[i] === v",
        arg={"i": edge_index, "v": value},
        timeout=TIMEOUT_MS,
    )


def finish_lesson_if_open(page: Page, puzzle_type: str) -> None:
    dialog = page.locator("dialog[open]")
    if not dialog.count():
        return
    check(dialog.locator('[data-action="lesson-example"]').count() == 1, f"{puzzle_type} lesson opens before play")
    dialog.locator('[data-action="lesson-example"]').click()
    if puzzle_type == "bridges":
        target = 2
    elif puzzle_type == "dossier":
        target = 0
    elif puzzle_type == "scene":
        if dialog.locator('[data-action="lesson-person"]').count():
            dialog.locator('[data-action="lesson-person"]').click()
        target = 5
    elif puzzle_type == "witness":
        target = 1
    else:
        raise AssertionError(f"unexpected expedition lesson type {puzzle_type}")
    dialog.locator(f'[data-action="lesson-tap"][data-cell="{target}"]').click()
    check(dialog.locator(".lesson-success").count() == 1, f"{puzzle_type} miniature lesson responds")
    dialog.locator('[data-action="lesson-finish"]').click()
    page.wait_for_timeout(150)
    check(page.locator("dialog[open]").count() == 0, f"{puzzle_type} lesson hands control to the puzzle")


def wait_completed(page: Page, puzzle_id: str) -> None:
    wait_check(page,
        "id => AlibiDiagnostics.getCurrent()?.puzzle.id === id && Boolean(AlibiDiagnostics.getCurrent()?.completedAt)",
        arg=puzzle_id,
        timeout=TIMEOUT_MS,
    )
    check(bool(current(page)["completedAt"]), f"{puzzle_id} completion is recorded")


def chapter_reveal(page: Page, label: str) -> None:
    reveal = page.locator(".chapter-reveal")
    check(reveal.count() > 0, f"{label} completion has a chapter-reveal marker")
    check(any(reveal.nth(i).is_visible() for i in range(reveal.count())), f"{label} chapter reveal is visible after completion")


def chapter_revelations_hidden(page: Page, label: str) -> None:
    revelations = page.locator(".chapter-revelation")
    check(revelations.count() == 0, f"{label} does not put chapter answers in the DOM")
    check(not any(revelations.nth(i).is_visible() for i in range(revelations.count())), f"{label} chapter revelations stay hidden before completion")


def honest_hint_no_autoapply(page: Page) -> None:
    before = state(page)["cells"][:]
    page.locator('[data-action="hint"]').first.click()
    dialog = page.locator("dialog[open]")
    check(dialog.count() == 1, "Bridges hint opens its own dialog")
    text = dialog.inner_text().lower()
    check(
        "does not look at the stored answer" in text
        or "not a check against the hidden answer" in text,
        "Bridges deduction hint is honest about its evidence",
    )
    check(state(page)["cells"] == before, "Bridges deduction hint does not auto-apply an answer")
    close_dialog(page)


def complete_bridges(page: Page) -> None:
    set_scenario("bridges")
    p = catalog["bridges-01"]
    play(page, "bridges-01")
    finish_lesson_if_open(page, "bridges")
    edges = bridge_edges(p)
    check(len(edges) == len(p["solution"]), "Bridges graph edge ordering matches the live solution vector")
    honest_hint_no_autoapply(page)

    # Delay one save in this disposable test profile to exercise honest busy feedback.
    page.evaluate("""() => {
        const original = AlibiStorage.Store.prototype.saveRun;
        let delayed = false;
        AlibiStorage.Store.prototype.saveRun = async function(snapshot, revision) {
            if (!delayed && snapshot.puzzle.id === 'bridges-01' && snapshot.moves === 1) {
                delayed = true;
                await new Promise(resolve => setTimeout(resolve, 650));
            }
            return original.call(this, snapshot, revision);
        };
    }""")
    # Exercise the documented one -> two -> none cycle on the first pair.
    for expected in (1, 2, 0):
        bridge_click(page, p, 0)
        wait_edge(page, 0, expected)
        check(state(page)["cells"][0] == expected, f"bridges-01 pair cycles to {expected}")
        if expected == 1:
            check(page.locator("#save-state").inner_text() == "Saving…", "rerender keeps Saving visible until the delayed save commits")
            wait_check(page, "() => AlibiDiagnostics.getStatus().pendingSaves === 0")
            check(page.locator("#save-state").inner_text() == "Saved on this device", "save indicator changes only after the queue drains")

    # Keyboard selection and navigation use the same island controls.
    first_cell = p["islands"][0]["cell"]
    second_cell = p["islands"][1]["cell"]
    first = page.locator(f'[data-action="cell"][data-cell="{first_cell}"]')
    first.focus()
    page.keyboard.press("Enter")
    wait_check(page,
        "cell => document.getElementById('cell-' + cell)?.getAttribute('aria-pressed') === 'true'",
        arg=first_cell,
        timeout=TIMEOUT_MS,
    )
    check(True, "bridges-01 Enter selects an island")
    page.keyboard.press("ArrowRight")
    wait_check(page,
        "cell => Number(document.activeElement?.dataset.cell) === cell",
        arg=second_cell,
        timeout=TIMEOUT_MS,
    )
    check(True, "bridges-01 ArrowRight moves across empty cells to the next island")
    page.keyboard.press("Enter")
    wait_edge(page, 0, 1)
    check(state(page)["cells"][0] == 1, "bridges-01 Enter connects the selected pair")

    bridge_click(page, p, 0)
    wait_edge(page, 0, 2)
    page.locator('.main-tools [data-action="undo"]').click()
    wait_edge(page, 0, 1)
    check(state(page)["cells"][0] == 1, "bridges-01 undo reverses a bridge change")
    page.locator('[data-action="redo"]').click()
    wait_edge(page, 0, 2)
    check(state(page)["cells"][0] == 2, "bridges-01 redo restores a bridge change")
    before_reload = state(page)["cells"][:]
    page.wait_for_timeout(350)
    page.reload(wait_until="domcontentloaded", timeout=TIMEOUT_MS)
    wait_diag(page)
    wait_check(page, "id => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg="bridges-01", timeout=TIMEOUT_MS)
    check(state(page)["cells"] == before_reload, "bridges-01 midgame bridge state survives reload")

    for i, target in enumerate(p["solution"]):
        while state(page)["cells"][i] != target:
            before = state(page)["cells"][i]
            bridge_click(page, p, i)
            wait_edge(page, i, (before + 1) % 3)
    wait_completed(page, "bridges-01")
    close_dialog(page)

    for puzzle_id in BRIDGE_IDS[1:]:
        p = catalog[puzzle_id]
        play(page, puzzle_id)
        if puzzle_id == "bridges-08":
            screenshot(page, "bridges-08-board")
        for i, target in enumerate(p["solution"]):
            while state(page)["cells"][i] != target:
                before = state(page)["cells"][i]
                bridge_click(page, p, i)
                page.wait_for_timeout(35)
                check(state(page)["cells"][i] == (before + 1) % 3, f"{puzzle_id} pair control advances edge {i}")
        wait_completed(page, puzzle_id)
        close_dialog(page)
    check(True, "all eight Bridges puzzles complete through island controls")


def invalid_diagonal(page: Page) -> None:
    set_scenario("bridges-invalid-diagonal")
    # Start the family on Bridges-01 so the first-run lesson is proven before
    # the malformed-pair check moves to a separate unsolved board.
    play(page, "bridges-01")
    finish_lesson_if_open(page, "bridges")
    p = catalog["bridges-02"]
    play(page, "bridges-02")
    before = state(page)["cells"][:]
    islands = p["islands"]
    pair: tuple[int, int] | None = None
    for a, left in enumerate(islands):
        for b, right in enumerate(islands):
            if a < b and left["cell"] % p["size"] != right["cell"] % p["size"] and left["cell"] // p["size"] != right["cell"] // p["size"]:
                pair = (a, b)
                break
        if pair:
            break
    check(pair is not None, "Bridges-02 contains an actual diagonal non-route to reject")
    assert pair is not None
    for index in pair:
        page.locator(f'[data-action="cell"][data-cell="{islands[index]["cell"]}"]').click()
    page.wait_for_timeout(160)
    check(state(page)["cells"] == before, "diagonal island pair leaves the bridge state unchanged")
    check("nearest island" in page.locator("body").inner_text().lower(), "diagonal island pair explains the straight-route rule")
    close_dialog(page)


def offline_bridges(page: Page, context: BrowserContext) -> None:
    set_scenario("bridges-offline")
    p = catalog["bridges-08"]
    play(page, "bridges-08")
    page.locator('[data-action="restart"]').click()
    page.locator('[data-action="restart-confirm"]').click()
    wait_check(page, "id => AlibiDiagnostics.getCurrent()?.puzzle.id === id && !AlibiDiagnostics.getCurrent()?.completedAt", arg="bridges-08", timeout=TIMEOUT_MS)
    move_edges = [i for i, value in enumerate(p["solution"]) if value > 0]
    check(len(move_edges) >= 2, "bridges-08 has two online/offline bridge moves available")
    first, second = move_edges[:2]
    bridge_click(page, p, first)
    wait_edge(page, first, 1)
    wait_check(page, "() => AlibiDiagnostics.getStatus().offlineReady === true", timeout=SW_TIMEOUT_MS)
    wait_check(page, "() => AlibiDiagnostics.getStatus().pendingSaves === 0", timeout=TIMEOUT_MS)
    check(page.locator("#save-state").inner_text() == "Saved on this device", "reload waits for the committed-save indicator")
    page.reload(wait_until="domcontentloaded", timeout=TIMEOUT_MS)
    wait_diag(page)
    wait_check(page, "() => Boolean(navigator.serviceWorker?.controller)", timeout=TIMEOUT_MS)
    check(True, "service worker controls the online Bridges page")
    context.set_offline(True)
    try:
        page.reload(wait_until="domcontentloaded", timeout=15000)
        wait_diag(page)
        check(page.evaluate("AlibiDiagnostics.getStatus().offlineReady") is True, "offline-ready status survives an offline Bridges reload")
        check(current(page)["puzzle"]["id"] == "bridges-08", "offline reload returns to Bridges-08")
        check(state(page)["cells"][first] == 1, "online Bridges move survives offline reload")
        check(
            page.evaluate("""async () => { try { await fetch('./__expedition_probe__?t=' + Date.now(), {cache: 'no-store'}); return false; } catch { return true; } }"""),
            "an uncached request fails while cached Bridges remains playable",
        )
        bridge_click(page, p, second)
        wait_edge(page, second, 1)
        check(state(page)["cells"][second] == 1, "offline Bridges move uses the real island controls")
    finally:
        context.set_offline(False)


def complete_witness(page: Page, p: dict[str, Any], book: str) -> None:
    solution = int(p["solution"])
    wrong = (solution + 1) % p["size"]
    page.locator(f'[data-action="choose-accuse"][data-id="{wrong}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    page.wait_for_timeout(130)
    check(not current(page)["completedAt"], f"{p['id']} rejects a wrong witness conclusion")
    page.locator(f'[data-action="choose-accuse"][data-id="{solution}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    wait_completed(page, p["id"])
    chapter_reveal(page, p["id"])


def complete_dossier(page: Page, p: dict[str, Any], book: str) -> None:
    n = int(p["size"])
    for category in range(2):
        page.locator(f'[data-action="dossier-tab"][data-value="{category}"]').click()
        for person in range(n):
            value = int(p["solution"][category * n + person])
            index = category * n * n + person * n + value
            page.locator(f'[data-action="mark"][data-cell="{index}"]').click()
            page.wait_for_timeout(25)
    culprit = p["solution"][n:].index(p["targetItem"])
    page.locator(f'[data-action="choose-accuse"][data-id="{culprit}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    wait_completed(page, p["id"])
    chapter_reveal(page, p["id"])


def complete_scene(page: Page, p: dict[str, Any], book: str) -> None:
    for person in p["people"]:
        page.locator(f'[data-action="person"][data-id="{person["id"]}"]').click()
        cell = p["solution"][person["id"]]
        page.locator(f'[data-action="cell"][data-cell="{cell}"]').click()
        wait_check(page,
            "({id, cell}) => AlibiDiagnostics.getCurrent()?.state.placements[id] === cell",
            arg={"id": person["id"], "cell": cell},
            timeout=TIMEOUT_MS,
        )
    check(len(state(page)["placements"]) == 5, f"{p['id']} places all five people through the scene controls")
    victim_cell = p["solution"][p["victim"]]
    victim_room = p["rooms"][victim_cell]
    culprit = next(
        person["id"]
        for person in p["people"]
        if person["id"] != p["victim"] and p["rooms"][p["solution"][person["id"]]] == victim_room
    )
    check(not current(page)["completedAt"], f"{p['id']} waits for the explicit scene accusation")
    page.locator(f'[data-action="choose-accuse"][data-id="{culprit}"]').click()
    page.locator('[data-action="submit-accuse"]').click()
    wait_completed(page, p["id"])
    chapter_reveal(page, p["id"])


def complete_bellweather(page: Page) -> None:
    set_scenario("bellweather-casebook")
    route(page, f"casebooks/{BELLWEATHER_ID}")
    page.wait_for_selector(".chapter", timeout=TIMEOUT_MS)
    check("Last Light at Bellweather" in page.locator("body").inner_text(), "Bellweather case page is visible")
    check(page.locator(".chapter").count() == 6, "Bellweather case page lists six chapters")
    chapter_revelations_hidden(page, "Bellweather before play")
    screenshot(page, "bellweather-casebook")

    for index, puzzle_id in enumerate(BELLWEATHER_IDS):
        p = catalog[puzzle_id]
        if index == 0:
            play(page, puzzle_id, BELLWEATHER_ID)
        else:
            check(current(page)["puzzle"]["id"] == puzzle_id, f"casebook opens {puzzle_id} without losing its lesson")
        finish_lesson_if_open(page, p["type"])
        before = page.locator(".chapter-reveal")
        check(casebook["chapters"][index]["revelation"] not in " ".join(before.all_text_contents()), f"{puzzle_id} does not render its answer before solving")
        check(not any(before.nth(i).is_visible() for i in range(before.count())), f"{puzzle_id} chapter reveal stays hidden before solving")
        if p["type"] == "witness":
            complete_witness(page, p, BELLWEATHER_ID)
        elif p["type"] == "dossier":
            complete_dossier(page, p, BELLWEATHER_ID)
        elif p["type"] == "scene":
            complete_scene(page, p, BELLWEATHER_ID)
        else:
            raise AssertionError(f"unexpected Bellweather type {p['type']}")
        if index < len(BELLWEATHER_IDS) - 1:
            next_id = BELLWEATHER_IDS[index + 1]
            page.locator('dialog[open] [data-action="next"]').click()
            wait_check(page, "id => AlibiDiagnostics.getCurrent()?.puzzle.id === id", arg=next_id, timeout=TIMEOUT_MS)
            check(current(page)["puzzle"]["id"] == next_id, f"casebook advances to {next_id}")
        else:
            page.locator('dialog[open] [data-action="next"]').click()
            wait_check(page, "path => location.hash.replace(/^#\\/?/, '').startsWith(path)", arg=f"casebooks/{BELLWEATHER_ID}", timeout=TIMEOUT_MS)
            page.wait_for_selector(".case-ending", timeout=TIMEOUT_MS)
            check(page.locator(".case-ending").count() == 1, "Bellweather casebook shows its final ending after six chapters")
            check(page.locator(".chapter-revelation").count() == 6, "all six Bellweather chapter revelations remain in the finished file")
            check(all(page.locator(".chapter-revelation").nth(i).is_visible() for i in range(6)), "all six Bellweather revelations are visible after completion")


def run() -> int:
    global started, RESULTS
    started = time.monotonic()
    profile_root = Path(tempfile.mkdtemp(prefix="alibi-expedition-")).resolve()
    RESULTS.mkdir(parents=True, exist_ok=True)
    RESULTS = Path(tempfile.mkdtemp(prefix="run-", dir=RESULTS)).resolve()
    passed = False
    context: BrowserContext | None = None
    page: Page | None = None
    try:
        with sync_playwright() as pw:
            context = launch(pw, profile_root / "mobile-390")
            page = context.pages[0] if context.pages else context.new_page()
            page.set_default_timeout(TIMEOUT_MS)
            watch_page(page)
            boot(page)
            screenshot(page, "390-home")
            invalid_diagonal(page)
            complete_bridges(page)
            offline_bridges(page, context)
            complete_bellweather(page)
            page.set_viewport_size({"width": 1440, "height": 1000})
            route(page, "home")
            screenshot(page, "1440-home")
            check(not errors, "no uncaught browser page errors")
            passed = True
    except Exception as exc:
        errors.append({"scenario": scenario_name, "kind": "failure", "message": f"{type(exc).__name__}: {exc}"})
        if page is not None:
            try:
                screenshot(page, "failure")
            except PlaywrightError:
                pass
    finally:
        if context is not None:
            try:
                context.close()
            except Exception:
                pass
        shutil.rmtree(profile_root, ignore_errors=True)
    report = {
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "durationSeconds": round(time.monotonic() - started, 3),
        "url": BASE,
        "build": runtime.get("build"),
        "applicationVersion": runtime.get("applicationVersion"),
        "checks": checks,
        "passed": passed and not errors,
        "errors": errors,
        "consoleErrors": console_errors,
        "scope": "fresh persistent Chromium mobile-390 profile; real DOM, IndexedDB, keyboard, lessons, casebook progression, service worker and offline reload",
    }
    (RESULTS / "expedition-results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "checks": len(checks), "errors": len(errors), "results": str(RESULTS / 'expedition-results.json')}, indent=2), flush=True)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(run())
