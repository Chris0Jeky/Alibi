r"""Bounded real-origin acceptance checks for Alibi.

It uses a fresh persistent Chromium profile per scenario, so it does not touch
an existing browser profile.
Run with the repository venv's Python/Playwright, for example:

    python tests/browser_origin.py

Set ALIBI_ROOT when this file is outside the checkout (the default assumes a
copy under tests/), and ALIBI_URL for a hosted origin. Evidence is written only
under ROOT/test-results/browser-origin (or ALIBI_RESULTS).
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from official_fixture import OFFICIAL_COUNT
from typing import Any, Callable
from urllib.parse import urljoin

from playwright.sync_api import (
    BrowserContext,
    Error as PlaywrightError,
    Page,
    sync_playwright,
)

ROOT = Path(os.environ.get("ALIBI_ROOT", Path(__file__).resolve().parents[1])).resolve()
BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/")
BASE = BASE if BASE.endswith("/") else BASE + "/"
RESULTS = Path(os.environ.get("ALIBI_RESULTS", ROOT / "test-results" / "browser-origin"))
RESULTS.mkdir(parents=True, exist_ok=True)
CHROMIUM_PATH = os.environ.get("CHROMIUM_PATH")
TIMEOUT_MS = int(os.environ.get("ALIBI_TIMEOUT_MS", "10000"))
IDB_TIMEOUT = float(os.environ.get("ALIBI_IDB_TIMEOUT", "10"))
SW_TIMEOUT = float(os.environ.get("ALIBI_SW_TIMEOUT", "45"))
SEED_PAGE = urljoin(BASE, "manifest.webmanifest")
ORIGIN_SCENARIOS = (
    "durability",
    "backup_restore",
    "cross_tab",
    "keyboard",
    "offline",
    "shared_paths",
    "malformed_draft",
    "malformed_persisted",
    "newer_database",
)

checks: list[str] = []
errors: list[dict[str, str]] = []
logs: list[dict[str, str]] = []
active_pages: list[Page] = []
runtime_info: dict[str, Any] = {}
started = time.monotonic()


def check(value: Any, label: str) -> None:
    if not value:
        raise AssertionError(label)
    checks.append(label)
    print(f"PASS {label}", flush=True)


def note(label: str) -> None:
    checks.append(label)
    print(f"PASS {label}", flush=True)


def page_errors(page: Page, scenario: str) -> None:
    def on_error(error: Exception) -> None:
        errors.append({"scenario": scenario, "message": str(error)})
    page.on("pageerror", on_error)
    page.on(
        "console",
        lambda message: logs.append(
            {"scenario": scenario, "type": message.type, "message": message.text}
        )
        if message.type in {"error", "warning"}
        else None,
    )


def launch_profile(pw: Any, profile: Path) -> BrowserContext:
    launch: dict[str, Any] = {
        "headless": True,
        "viewport": {"width": 390, "height": 900},
        "accept_downloads": True,
        "reduced_motion": "reduce",
        "service_workers": "allow",
        "args": ["--no-sandbox"],
    }
    if CHROMIUM_PATH:
        launch["executable_path"] = CHROMIUM_PATH
    elif Path("/usr/bin/chromium").exists():
        launch["executable_path"] = "/usr/bin/chromium"
    return pw.chromium.launch_persistent_context(str(profile), **launch)


def new_page(context: BrowserContext, scenario: str) -> Page:
    page = context.new_page()
    page.set_default_timeout(TIMEOUT_MS)
    page_errors(page, scenario)
    active_pages.append(page)
    return page


def wait_diag(page: Page) -> None:
    wait_page(page, "Boolean(window.AlibiDiagnostics)", what="AlibiDiagnostics")
    page.wait_for_timeout(100)


def boot(page: Page, require_indexeddb: bool = True) -> None:
    page.goto(BASE, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
    wait_diag(page)
    runtime_info.update(
        page.evaluate(
            """() => ({
              build: globalThis.ALIBI_CONFIG?.build,
              version: globalThis.ALIBI_CONFIG?.version,
              userAgent: navigator.userAgent
            })"""
        )
    )
    check(page.title().startswith("Alibi"), "application boots on real origin")
    check(
        page.evaluate("()=>AlibiPlatform.build.target==='web' && !AlibiPlatform.capabilities().nativeHost && typeof Capacitor==='undefined'"),
        "real-origin PWA installs its explicit browser platform",
    )
    counts = page.evaluate("AlibiDiagnostics.getCounts()")
    check(counts["puzzles"] == OFFICIAL_COUNT, "real-origin catalogue matches the official registry")
    check(counts["types"] == 13, "real-origin catalogue has thirteen engines")
    if require_indexeddb:
        check(
            page.evaluate("AlibiDiagnostics.storage") == "indexeddb",
            "real-origin storage uses IndexedDB",
        )


def dismiss_dialog(page: Page) -> None:
    dialog = page.locator("dialog[open]")
    if not dialog.count():
        return
    close = dialog.locator('[data-action="close-dialog"]')
    if close.count():
        close.first.click()
    else:
        page.keyboard.press("Escape")
    page.wait_for_timeout(80)


def route(page: Page, path: str) -> None:
    dismiss_dialog(page)
    page.evaluate("(path) => { location.hash = '#/' + path; }", path)
    page.wait_for_timeout(120)
    if path.startswith("play/"):
        puzzle_id = path.split("/", 1)[1].split("@", 1)[0]
        wait_page(
            page,
            "(id) => window.AlibiDiagnostics?.getCurrent()?.puzzle.id === id",
            arg=puzzle_id,
            what=f"route {path}",
        )
    else:
        wait_page(
            page,
            "(path) => location.hash.replace(/^#\\/?/, '').startsWith(path)",
            arg=path,
            what=f"route {path}",
        )
    dismiss_dialog(page)


def read_idb(page: Page, store: str, key: str | None = None) -> Any:
    return page.evaluate(
        """({store, key}) => new Promise((resolve, reject) => {
          const request = indexedDB.open('alibi-device');
          request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(store)) {
              db.close();
              resolve(null);
              return;
            }
            const tx = db.transaction(store, 'readonly');
            const source = tx.objectStore(store);
            const read = key === null ? source.getAll() : source.get(key);
            read.onerror = () => reject(read.error || new Error('IndexedDB read failed'));
            read.onsuccess = () => {
              const value = key === null ? read.result.map((x) => x.value) : read.result?.value;
              db.close();
              resolve(value ?? null);
            };
          };
        })""",
        {"store": store, "key": key},
    )


def wait_page(
    page: Page,
    expression: str,
    arg: Any = None,
    *,
    what: str = "browser condition",
    timeout_seconds: float | None = None,
) -> Any:
    deadline = time.monotonic() + (IDB_TIMEOUT if timeout_seconds is None else timeout_seconds)
    last: Any = None
    while time.monotonic() < deadline:
        try:
            last = page.evaluate(expression, arg)
            if last:
                return last
        except PlaywrightError:
            pass
        page.wait_for_timeout(100)
    raise AssertionError(f"{what} did not settle; last={last!r}")


def wait_idb(
    page: Page,
    store: str,
    key: str,
    predicate: Callable[[Any], bool],
    label: str,
) -> Any:
    deadline = time.monotonic() + IDB_TIMEOUT
    last: Any = None
    while time.monotonic() < deadline:
        try:
            last = read_idb(page, store, key)
            if predicate(last):
                note(label)
                return last
        except PlaywrightError:
            pass
        page.wait_for_timeout(100)
    raise AssertionError(f"{label}: IndexedDB value did not settle; last={last!r}")


def wait_status(page: Page, predicate: Callable[[Any], bool], label: str) -> Any:
    deadline = time.monotonic() + IDB_TIMEOUT
    last: Any = None
    while time.monotonic() < deadline:
        last = page.evaluate("AlibiDiagnostics.getStatus()")
        if predicate(last):
            note(label)
            return last
        page.wait_for_timeout(100)
    raise AssertionError(f"{label}: status did not settle; last={last!r}")


def current(page: Page) -> dict[str, Any]:
    value = page.evaluate("AlibiDiagnostics.getCurrent()")
    if not value:
        raise AssertionError("AlibiDiagnostics has no current puzzle")
    return value


def cells(page: Page, enabled_only: bool = False) -> list[int]:
    locator = page.locator('[data-action="cell"][data-cell]')
    if enabled_only:
        return locator.evaluate_all(
            "(elements) => elements.filter((el) => !el.disabled).map((el) => Number(el.dataset.cell))"
        )
    return locator.evaluate_all("(elements) => elements.map((el) => Number(el.dataset.cell))")


def move_first_cell(page: Page, label: str) -> tuple[int, dict[str, Any], dict[str, Any]]:
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 1:
        raise AssertionError(f"{label}: no enabled board cell")
    cell = enabled[0]
    before = current(page)
    old = before["state"]["cells"][cell]
    page.locator(f'[data-action="cell"][data-cell="{cell}"]').click()
    wait_page(
        page,
        """({cell, old}) => {
          const c = AlibiDiagnostics.getCurrent();
          return c && c.state.cells[cell] !== old;
        }""",
        arg={"cell": cell, "old": old},
        what=f"{label} state change",
    )
    after = current(page)
    note(label)
    return cell, before, after


def move_second_cell(page: Page, label: str, first: int) -> int:
    enabled = [i for i in cells(page, enabled_only=True) if i != first]
    if not enabled:
        raise AssertionError(f"{label}: no second enabled board cell")
    cell = enabled[0]
    old = current(page)["state"]["cells"][cell]
    page.locator(f'[data-action="cell"][data-cell="{cell}"]').click()
    wait_page(
        page,
        """({cell, old}) => {
          const c = AlibiDiagnostics.getCurrent();
          return c && c.state.cells[cell] !== old;
        }""",
        arg={"cell": cell, "old": old},
        what=f"{label} state change",
    )
    note(label)
    return cell


def attempt_cell_without_save(page: Page, label: str, cell: int) -> None:
    old = current(page)["state"]["cells"][cell]
    page.locator(f'[data-action="cell"][data-cell="{cell}"]').click()
    page.wait_for_timeout(250)
    check(current(page)["state"]["cells"][cell] == old, label)


def wait_run(page: Page, key: str, rev: int, note_text: str | None = None) -> dict[str, Any]:
    def ready(record: Any) -> bool:
        return (
            isinstance(record, dict)
            and record.get("key") == key
            and isinstance(record.get("rev"), int)
            and record["rev"] >= rev
            and (note_text is None or record.get("note") == note_text)
        )
    return wait_idb(page, "runs", key, ready, f"IndexedDB saved {key} at revision {rev}")


def seed_database(
    page: Page,
    *,
    version: int = 1,
    meta_value: Any = None,
) -> None:
    page.goto(SEED_PAGE, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
    page.evaluate(
        """({version, metaValue}) => new Promise((resolve, reject) => {
          const request = indexedDB.open('alibi-device', version);
          request.onerror = () => reject(request.error || new Error('seed open failed'));
          request.onupgradeneeded = () => {
            const db = request.result;
            for (const name of ['runs', 'packs', 'meta'])
              if (!db.objectStoreNames.contains(name))
                db.createObjectStore(name, {keyPath: 'key'});
          };
          request.onsuccess = () => {
            const db = request.result;
            if (metaValue === null) {
              db.close();
              resolve(true);
              return;
            }
            const tx = db.transaction('meta', 'readwrite');
            tx.objectStore('meta').put({key: 'workshop-draft', value: metaValue});
            tx.oncomplete = () => { db.close(); resolve(true); };
            tx.onabort = () => reject(tx.error || new Error('seed transaction aborted'));
            tx.onerror = () => reject(tx.error || new Error('seed transaction failed'));
          };
        })""",
        {"version": version, "metaValue": meta_value},
    )


def input_backup(page: Page, backup: dict[str, Any], name: str = "backup.json") -> None:
    page.locator("#backup-input").set_input_files(
        {"name": name, "mimeType": "application/json", "buffer": json.dumps(backup).encode()}
    )
    wait_page(page, "Boolean(document.querySelector('dialog[open]'))", what="backup dialog")


def click_reload_action(page: Page, selector: str) -> None:
    old_origin = page.evaluate("performance.timeOrigin")
    locator = page.locator(selector)
    check(locator.count() == 1, f"restore action exists: {selector}")
    locator.click(force=True)
    try:
        wait_page(
            page,
            "(origin) => performance.timeOrigin !== origin",
            arg=old_origin,
            what="document reload",
        )
    except AssertionError:
        print(
            f"RELOAD DEBUG url={page.url} status={page.evaluate('AlibiDiagnostics.getStatus()')} "
            f"runs={read_idb(page, 'runs')} body={page_text(page)[-1200:]}",
            flush=True,
        )
        raise
    wait_diag(page)
    dismiss_dialog(page)


def write_note(page: Page, text: str) -> None:
    page.locator('[data-action="evidence-tab"][data-value="notes"]').click()
    if page.locator("#play-notes").is_visible():
        page.locator("#play-notes").fill(text)
    else:
        page.locator('[data-action="quick-panel"][data-value="notes"]').click()
        page.locator("#quick-notes").fill(text)
        dismiss_dialog(page)


def screenshot(page: Page, name: str) -> None:
    try:
        page.screenshot(path=str(RESULTS / f"{name}.png"), full_page=True)
    except PlaywrightError:
        pass


def scenario_durability(pw: Any, root: Path) -> None:
    profile = root / "durability"
    context = launch_profile(pw, profile)
    try:
        page = new_page(context, "durability")
        boot(page)
        route(page, "settings")
        page.locator("#theme-select").select_option("night")
        page.locator("#setting-largeText").check()
        wait_idb(
            page,
            "meta",
            "settings",
            lambda value: isinstance(value, dict)
            and value.get("theme") == "night"
            and value.get("largeText") is True,
            "settings save is visible in IndexedDB",
        )
        context.close()
        context = launch_profile(pw, profile)
        page = new_page(context, "durability-restart")
        boot(page)
        route(page, "settings")
        check(page.locator("#theme-select").input_value() == "night", "settings survive browser restart")
        check(page.locator("#setting-largeText").is_checked(), "setting toggle survives browser restart")

        route(page, "play/lightup-04@1")
        move_cell, _, move_after = move_first_cell(page, "Lightup move uses the actual board control")
        run_key = "lightup-04@1"
        wait_run(page, run_key, 1)
        write_note(page, "A note saved through the real puzzle UI.")
        wait_run(page, run_key, 2, "A note saved through the real puzzle UI.")
        page.reload(wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        wait_diag(page)
        dismiss_dialog(page)
        check(
            current(page)["state"]["cells"][move_cell] == move_after["state"]["cells"][move_cell],
            "board move survives page reload",
        )
        check(
            current(page)["note"] == "A note saved through the real puzzle UI.",
            "puzzle notes survive page reload",
        )
    finally:
        try:
            context.close()
        except Exception:
            pass


def scenario_backup_restore(pw: Any, root: Path) -> None:
    profile = root / "backup-restore"
    context = launch_profile(pw, profile)
    try:
        page = new_page(context, "backup-restore")
        boot(page)
        route(page, "play/lightup-03@1")
        move_first_cell(page, "backup baseline move uses the real UI")
        baseline_key = "lightup-03@1"
        wait_run(page, baseline_key, 1)
        baseline_note = "Baseline export note."
        write_note(page, baseline_note)
        baseline = wait_run(page, baseline_key, 2, baseline_note)
        route(page, "settings")
        with page.expect_download() as download_info:
            page.locator('[data-action="export"]').first.click()
        backup = json.loads(Path(download_info.value.path()).read_text(encoding="utf-8"))
        check(backup["format"] == "alibi-backup", "backup export uses the documented envelope")
        check(
            any(r.get("key") == baseline_key and r.get("note") == baseline_note for r in backup["runs"]),
            "backup export contains the saved board and note",
        )

        route(page, "play/tents-01@1")
        move_first_cell(page, "second run is created through the real UI")
        extra_key = "tents-01@1"
        wait_run(page, extra_key, 1)
        before_merge = read_idb(page, "runs")
        check(
            {r["key"] for r in before_merge} == {baseline_key, extra_key},
            "IndexedDB contains both runs before merge",
        )

        route(page, "settings")
        input_backup(page, backup, "baseline.json")
        click_reload_action(page, '[data-action="restore-merge"]')
        merged = read_idb(page, "runs")
        check({r["key"] for r in merged} == {baseline_key, extra_key}, "merge preserves existing device progress")
        check(
            next(r for r in merged if r["key"] == baseline_key)["note"] == baseline_note,
            "merge preserves the imported baseline note",
        )

        route(page, "play/lightup-02@1")
        move_first_cell(page, "pre-replace run uses the real UI")
        recovery_key = "lightup-02@1"
        wait_run(page, recovery_key, 1)
        before_replace = read_idb(page, "runs")
        check(
            {r["key"] for r in before_replace} == {baseline_key, extra_key, recovery_key},
            "IndexedDB has recoverable progress before replacement",
        )

        route(page, "settings")
        input_backup(page, backup, "baseline-again.json")
        page.locator('[data-action="restore-replace"]').click()
        wait_page(
            page,
            "Boolean(document.querySelector('[data-action=\"restore-replace-confirm\"]'))",
            what="replace confirmation",
        )
        click_reload_action(page, '[data-action="restore-replace-confirm"]')
        replaced = read_idb(page, "runs")
        replaced_keys = {r["key"] for r in replaced}
        check(
            replaced_keys == {baseline_key},
            f"replace restores exactly the exported run set (actual {sorted(replaced_keys)})",
        )
        with page.expect_download() as recovery_info:
            page.locator('[data-action="recovery"]').click()
        recovery = json.loads(Path(recovery_info.value.path()).read_text(encoding="utf-8"))
        recovery_keys = {r["key"] for r in recovery["runs"]}
        check(
            {extra_key, recovery_key}.issubset(recovery_keys),
            "recovery button exports the pre-replace progress",
        )
    finally:
        try:
            context.close()
        except Exception:
            pass


def scenario_cross_tab(pw: Any, root: Path) -> None:
    profile = root / "cross-tab"
    context = launch_profile(pw, profile)
    try:
        first = new_page(context, "cross-tab-a")
        second = new_page(context, "cross-tab-b")
        boot(first)
        boot(second)
        route(first, "play/nonogram-01@1")
        route(second, "play/nonogram-01@1")
        first_cell, _, first_after = move_first_cell(first, "tab A makes the first UI move")
        wait_run(first, "nonogram-01@1", 1)
        wait_status(
            second,
            lambda value: "another tab" in str(value.get("saveError", "")).lower()
            or "another tab" in page_text(second).lower(),
            "tab B receives the stale-write stop notice",
        )
        second_before = current(second)
        second_cell = [i for i in cells(second, enabled_only=True) if i != first_cell][0]
        attempt_cell_without_save(second, "tab B blocks a stale UI move", second_cell)
        second_after = current(second)
        check(
            second_after["state"] == second_before["state"],
            "tab B cannot enqueue a stale UI write after the notice",
        )
        stored = wait_run(first, "nonogram-01@1", 1)
        check(stored["state"] == first_after["state"], "IndexedDB retains tab A's winning state")
        check(stored["state"]["cells"][second_cell] == -1, "tab B's stale cell never reaches IndexedDB")
    finally:
        try:
            context.close()
        except Exception:
            pass


def page_text(page: Page) -> str:
    return page.locator("body").inner_text()


def keyboard_family(page: Page, puzzle_id: str, label: str) -> None:
    route(page, f"play/{puzzle_id}@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError(f"{label}: requires at least two enabled cells")
    first, second = enabled[:2]
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    before = current(page)
    page.keyboard.press("Enter")
    wait_page(
        page,
        """({cell, old}) => AlibiDiagnostics.getCurrent()?.state.cells[cell] !== old""",
        arg={"cell": first, "old": before["state"]["cells"][first]},
        what=f"{label} Enter state change",
    )
    check(current(page)["state"]["cells"][first] == 1, f"{label} first cell responds to Enter")
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("ArrowRight")
    wait_page(
        page,
        "(cell) => Number(document.activeElement?.dataset.cell) === cell",
        arg=second,
        what=f"{label} ArrowRight focus",
    )
    check(
        page.evaluate("Number(document.activeElement?.dataset.cell)") == second,
        f"{label} ArrowRight moves to the next enabled cell",
    )
    if puzzle_id == "lightup-01":
        disabled = [i for i in cells(page) if i not in enabled]
        if disabled:
            # Move both the app's selected cell and DOM focus back to the first.
            page.keyboard.press("ArrowLeft")
            wait_page(
                page,
                "(cell) => Number(document.activeElement?.dataset.cell) === cell",
                arg=first,
                what="lightup regression initial focus",
            )
            page.locator(f'[data-action="cell"][data-cell="{disabled[0]}"]').click(
                button="right", force=True
            )
            page.keyboard.press("ArrowRight")
            wait_page(
                page,
                "(cell) => Number(document.activeElement?.dataset.cell) === cell",
                arg=second,
                what="lightup disabled-cell contextmenu focus",
            )
            check(
                page.evaluate("Number(document.activeElement?.dataset.cell)") == second,
                "lightup right-clicking a disabled cell preserves keyboard navigation",
            )


def keyboard_arrows(page: Page, first: int, second: int, label: str) -> None:
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("ArrowRight")
    wait_page(
        page,
        "(cell) => Number(document.activeElement?.dataset.cell) === cell",
        arg=second,
        what=f"{label} ArrowRight focus",
    )
    check(
        page.evaluate("Number(document.activeElement?.dataset.cell)") == second,
        f"{label} ArrowRight moves to the next enabled cell",
    )


def keyboard_number(page: Page, puzzle_id: str, digit: str, label: str) -> None:
    route(page, f"play/{puzzle_id}@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError(f"{label}: requires at least two enabled cells")
    first, second = enabled[:2]
    if current(page)["state"]["cells"][first] != 0:
        raise AssertionError(f"{label}: expected an empty first cell")
    size = current(page)["puzzle"]["size"]
    if int(digit) > size:
        raise AssertionError(f"{label}: digit {digit} exceeds board size {size}")
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press(digit)
    wait_page(
        page,
        "({cell, value}) => AlibiDiagnostics.getCurrent()?.state.cells[cell] === value",
        arg={"cell": first, "value": int(digit)},
        what=f"{label} digit entry",
    )
    check(
        current(page)["state"]["cells"][first] == int(digit),
        f"{label} number key enters the digit",
    )
    keyboard_arrows(page, first, second, label)


def keyboard_binary(page: Page) -> None:
    route(page, "play/binary-01@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError("binary keyboard: requires at least two enabled cells")
    first, second = enabled[:2]
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({cell}) => AlibiDiagnostics.getCurrent()?.state.cells[cell] === 0",
        arg={"cell": first},
        what="binary keyboard Enter cycle",
    )
    check(
        current(page)["state"]["cells"][first] == 0,
        "binary keyboard Enter cycles the brush value",
    )
    page.keyboard.press("1")
    wait_page(
        page,
        "({cell}) => AlibiDiagnostics.getCurrent()?.state.cells[cell] === 1",
        arg={"cell": first},
        what="binary keyboard digit entry",
    )
    check(
        current(page)["state"]["cells"][first] == 1,
        "binary keyboard digit key sets the value",
    )
    keyboard_arrows(page, first, second, "binary keyboard")


def keyboard_aquarium(page: Page) -> None:
    route(page, "play/aquarium-01@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError("aquarium keyboard: requires at least two enabled cells")
    first, second = enabled[:2]
    tank = current(page)["puzzle"]["tanks"][first]
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({tank}) => AlibiDiagnostics.getCurrent()?.state.levels[tank] > 0",
        arg={"tank": tank},
        what="aquarium keyboard waterline",
    )
    check(
        current(page)["state"]["levels"][tank] > 0,
        "aquarium keyboard Enter sets the tank waterline",
    )
    keyboard_arrows(page, first, second, "aquarium keyboard")


def keyboard_network(page: Page) -> None:
    route(page, "play/network-01@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError("network keyboard: requires at least two enabled cells")
    first, second = enabled[:2]
    before = current(page)["state"]["rotations"][first]
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({cell, old}) => AlibiDiagnostics.getCurrent()?.state.rotations[cell] !== old",
        arg={"cell": first, "old": before},
        what="network keyboard rotate",
    )
    check(
        current(page)["state"]["rotations"][first] != before,
        "network keyboard Enter rotates clockwise",
    )
    page.keyboard.press("Shift+Enter")
    wait_page(
        page,
        "({cell, old}) => AlibiDiagnostics.getCurrent()?.state.rotations[cell] === old",
        arg={"cell": first, "old": before},
        what="network keyboard reverse rotate",
    )
    check(
        current(page)["state"]["rotations"][first] == before,
        "network keyboard Shift+Enter rotates back",
    )
    keyboard_arrows(page, first, second, "network keyboard")


def keyboard_trail(page: Page) -> None:
    route(page, "play/trail-01@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError("trail keyboard: requires at least two enabled cells")
    first, second = enabled[:2]
    state = current(page)
    if state["state"]["cells"][first] != 0:
        raise AssertionError("trail keyboard: expected an empty first cell")
    used = set(state["state"]["cells"]) | set(state["puzzle"]["givens"])
    expected = next(
        v for v in range(1, len(state["state"]["cells"]) + 1) if v not in used
    )
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({cell, value}) => AlibiDiagnostics.getCurrent()?.state.cells[cell] === value",
        arg={"cell": first, "value": expected},
        what="trail keyboard placement",
    )
    check(
        current(page)["state"]["cells"][first] == expected,
        "trail keyboard Enter places the next number",
    )
    keyboard_arrows(page, first, second, "trail keyboard")


def keyboard_scene(page: Page) -> None:
    route(page, "play/scene-01@1")
    enabled = cells(page, enabled_only=True)
    if len(enabled) < 2:
        raise AssertionError("scene keyboard: requires at least two enabled cells")
    first, second = enabled[:2]
    people = [person["id"] for person in current(page)["puzzle"]["people"]]
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({who, cell}) => AlibiDiagnostics.getCurrent()?.state.placements[who] === cell",
        arg={"who": people[0], "cell": first},
        what="scene keyboard placement",
    )
    check(
        current(page)["state"]["placements"].get(people[0]) == first,
        "scene keyboard Enter places the selected person",
    )
    keyboard_arrows(page, first, second, "scene keyboard")
    page.locator(f'[data-action="cell"][data-cell="{second}"]').focus()
    page.keyboard.press("2")
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({who, cell}) => AlibiDiagnostics.getCurrent()?.state.placements[who] === cell",
        arg={"who": people[1], "cell": second},
        what="scene keyboard person switch",
    )
    check(
        current(page)["state"]["placements"].get(people[1]) == second,
        "scene keyboard number key switches person",
    )


def keyboard_bridges(page: Page) -> None:
    route(page, "play/bridges-01@1")
    puzzle = current(page)["puzzle"]
    size = puzzle["size"]
    islands = sorted(island["cell"] for island in puzzle["islands"])
    pair = None
    for direction in ("row", "column"):
        rows: dict[int, list[int]] = {}
        for cell in islands:
            key = cell // size if direction == "row" else cell % size
            rows.setdefault(key, []).append(cell)
        for group in rows.values():
            ordered = sorted(
                group, key=(lambda c: c % size) if direction == "row" else (lambda c: c // size)
            )
            for left, right in zip(ordered, ordered[1:]):
                pair = (left, right, "ArrowRight" if direction == "row" else "ArrowDown")
                break
            if pair:
                break
        if pair:
            break
    if not pair:
        raise AssertionError("bridges keyboard: no aligned island pair")
    first, second, arrow = pair
    before = page.evaluate("JSON.stringify(AlibiDiagnostics.getCurrent()?.state.cells)")
    page.locator(f'[data-action="cell"][data-cell="{first}"]').focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "(cell) => document.getElementById('cell-' + cell)?.getAttribute('aria-pressed') === 'true'",
        arg=first,
        what="bridges keyboard anchor",
    )
    check(
        page.evaluate(
            "(cell) => document.getElementById('cell-' + cell)?.getAttribute('aria-pressed')",
            first,
        )
        == "true",
        "bridges keyboard Enter anchors the island",
    )
    page.keyboard.press(arrow)
    wait_page(
        page,
        "(cell) => Number(document.activeElement?.dataset.cell) === cell",
        arg=second,
        what="bridges keyboard island jump",
    )
    check(
        page.evaluate("Number(document.activeElement?.dataset.cell)") == second,
        "bridges keyboard arrows jump between islands",
    )
    page.keyboard.press("Enter")
    wait_page(
        page,
        "({old}) => JSON.stringify(AlibiDiagnostics.getCurrent()?.state.cells) !== old",
        arg={"old": before},
        what="bridges keyboard connect",
    )
    check(
        page.evaluate("JSON.stringify(AlibiDiagnostics.getCurrent()?.state.cells)") != before,
        "bridges keyboard connects the island pair",
    )


def keyboard_marks(page: Page, puzzle_id: str, label: str) -> None:
    route(page, f"play/{puzzle_id}@1")
    marks = page.locator('[data-action="mark"][data-cell]')
    if marks.count() < 3:
        raise AssertionError(f"{label}: requires at least three mark controls")
    order = marks.evaluate_all(
        "(elements) => elements.map((el) => Number(el.dataset.cell))"
    )
    marks.first.focus()
    page.keyboard.press("Enter")
    wait_page(
        page,
        "() => AlibiDiagnostics.getCurrent()?.state.marks[0] === 1",
        what=f"{label} Enter mark",
    )
    check(
        current(page)["state"]["marks"][0] == 1,
        f"{label} Enter cycles the first mark",
    )
    for step, expected in enumerate(order[1:3], start=1):
        page.keyboard.press("Tab")
        wait_page(
            page,
            "(cell) => Number(document.activeElement?.dataset.cell) === cell",
            arg=expected,
            what=f"{label} Tab stop {step}",
        )
        check(
            page.evaluate("Number(document.activeElement?.dataset.cell)") == expected,
            f"{label} Tab reaches mark {expected}",
        )
    marks.first.focus()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(300)
    check(
        page.evaluate("Number(document.activeElement?.dataset.cell)") == order[0],
        f"{label} ArrowRight leaves mark focus unchanged (arrows unbound)",
    )


def scenario_keyboard(pw: Any, root: Path) -> None:
    profile = root / "keyboard"
    context = launch_profile(pw, profile)
    try:
        page = new_page(context, "keyboard")
        boot(page)
        keyboard_family(page, "lightup-01", "lightup keyboard")
        keyboard_family(page, "tents-01", "tents keyboard")
        keyboard_family(page, "nonogram-01", "nonogram keyboard")
        keyboard_number(page, "sudoku-01", "3", "sudoku keyboard")
        keyboard_number(page, "futoshiki-01", "1", "futoshiki keyboard")
        keyboard_binary(page)
        keyboard_aquarium(page)
        keyboard_network(page)
        keyboard_trail(page)
        keyboard_scene(page)
        keyboard_bridges(page)
        keyboard_marks(page, "dossier-01", "dossier keyboard")
        keyboard_marks(page, "witness-01", "witness keyboard")
    finally:
        try:
            context.close()
        except Exception:
            pass


def scenario_offline(pw: Any, root: Path) -> None:
    profile = root / "offline"
    context = launch_profile(pw, profile)
    try:
        page = new_page(context, "offline")
        boot(page)
        try:
            wait_page(
                page,
                "AlibiDiagnostics.getStatus().offlineReady === true",
                what="offline-ready registration",
                timeout_seconds=SW_TIMEOUT,
            )
        except AssertionError:
            print(
                "OFFLINE DEBUG "
                + str(
                    page.evaluate(
                        """async () => ({
                          supported: 'serviceWorker' in navigator,
                          controller: !!navigator.serviceWorker?.controller,
                          registrations: (await navigator.serviceWorker?.getRegistrations() || []).map(
                            (r) => ({scope: r.scope, active: r.active?.state, installing: r.installing?.state, waiting: r.waiting?.state})
                          ),
                          status: AlibiDiagnostics.getStatus(),
                          toast: document.querySelector('#toasts')?.innerText
                        })"""
                    )
                ),
                flush=True,
            )
            raise
        page.reload(wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        wait_diag(page)
        wait_page(
            page,
            "() => Boolean(navigator.serviceWorker?.controller)",
            what="service worker controller",
        )
        check(True, "service worker controls a real-origin page before offline test")
        route(page, "play/lightup-01@1")
        first, _, first_after = move_first_cell(page, "online move seeds offline restart")
        wait_run(page, "lightup-01@1", 1)
        context.set_offline(True)
        page.reload(wait_until="domcontentloaded", timeout=15000)
        wait_diag(page)
        dismiss_dialog(page)
        check(
            page.evaluate("""async () => {
              try {
                await fetch('./__offline_probe__?t=' + Date.now(), {cache: 'no-store'});
                return false;
              } catch { return true; }
            }"""),
            "an uncached network request fails while the cached app remains playable",
        )
        check(
            page.evaluate("AlibiDiagnostics.getStatus().offlineReady") is True,
            "offline-ready status remains true after reload",
        )
        check(
            current(page)["state"]["cells"][first] == first_after["state"]["cells"][first],
            "saved move survives an offline page reload",
        )
        second = move_second_cell(page, "offline move uses the real board control", first)
        wait_run(page, "lightup-01@1", 2)
        stored = read_idb(page, "runs", "lightup-01@1")
        check(stored["state"]["cells"][second] == 1, "offline move is persisted in IndexedDB")
        context.set_offline(False)
    finally:
        try:
            context.set_offline(False)
        except Exception:
            pass
        try:
            context.close()
        except Exception:
            pass


def scenario_shared_paths(pw: Any, root: Path) -> None:
    """Issue #244: shared leaf/directory links boot with working assets.

    Covers cold and service-worker-controlled navigation to /privacy/,
    /about/ and /login/, query and explicit-fragment combinations, refresh,
    offline controlled navigation and an existing in-progress puzzle. Each
    explicitly cold alias gets a new persistent profile so its hashed assets
    must be fetched with 200; a separate warm context proves revalidation.
    """
    def expected_assets(page: Page) -> dict[str, list[str]]:
        return page.evaluate(
            """() => {
              // The emitted shell scripts defer startup. Optional scripts injected
              // after load (such as usage sharing) are not boot dependencies.
              const scripts = [...document.querySelectorAll('script[src][defer]')]
                .map((node) => new URL(node.src, location.href).href)
                .filter((url) => /\\/assets\\/[^/]+\\.[a-f0-9]{12}\\.js$/.test(new URL(url).pathname));
              const styles = [...document.querySelectorAll('link[rel="stylesheet"]')]
                .map((node) => new URL(node.href, location.href).href)
                .filter((url) => /\\/assets\\/[^/]+\\.[a-f0-9]{12}\\.css$/.test(new URL(url).pathname));
              return {scripts, styles};
            }"""
        )

    def assert_booted_assets(
        page: Page,
        responses: list[tuple[str, int]],
        label: str,
        allowed_statuses: set[int],
    ) -> None:
        expected = expected_assets(page)
        observed: dict[str, list[int]] = {}
        for url, status in responses:
            observed.setdefault(url.split("?", 1)[0], []).append(status)
        scripts = [url for url in expected["scripts"] if url.split("?", 1)[0] in observed]
        styles = [url for url in expected["styles"] if url.split("?", 1)[0] in observed]
        status_label = "200" if allowed_statuses == {200} else "200 or 304"
        check(bool(scripts), f"{label}: hashed board script loads with {status_label}")
        check(bool(styles), f"{label}: hashed stylesheet loads with {status_label}")
        check(
            all(any(status in allowed_statuses for status in observed.get(url.split("?", 1)[0], [])) for url in expected["scripts"]),
            f"{label}: expected hashed board scripts revalidate successfully",
        )
        check(
            all(any(status in allowed_statuses for status in observed.get(url.split("?", 1)[0], [])) for url in expected["styles"]),
            f"{label}: expected hashed stylesheet revalidates successfully",
        )

    def goto_alias(
        page: Page,
        responses: list[tuple[str, int]],
        url: str,
        label: str,
        expected_hash: str,
        allowed_statuses: set[int],
    ) -> None:
        responses.clear()
        page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        wait_diag(page)
        dismiss_dialog(page)
        check(page.evaluate("location.hash") == expected_hash, f"{label}: expected route hash")
        check(page.evaluate("Boolean(window.AlibiDiagnostics?.getCounts)"), f"{label}: diagnostics available")
        assert_booted_assets(page, responses, label, allowed_statuses)

    cold_aliases = (
        ("privacy-directory", "privacy/", "#/privacy", "cold /privacy/"),
        ("privacy-query", "privacy?from=shared-link", "#/privacy?from=shared-link", "cold /privacy with query"),
        ("about-fragment", "about/#/library", "#/library", "cold /about/ with explicit fragment"),
        (
            "about-query-fragment",
            "about?from=email#/library",
            "#/library?from=email",
            "cold /about/ with query and fragment",
        ),
    )
    for profile_name, path, expected_hash, label in cold_aliases:
        context = launch_profile(pw, root / f"shared-paths-cold-{profile_name}")
        try:
            if profile_name == "privacy-directory":
                # Startup must remain provable even when the optional, post-load
                # usage-sharing asset has no successful response to record.
                context.route("**/assets/observatory.*.js", lambda request: request.abort())
            page = new_page(context, f"shared-paths-{profile_name}")
            responses: list[tuple[str, int]] = []
            page.on("response", lambda response: responses.append((response.url, response.status)))
            goto_alias(page, responses, urljoin(BASE, path), label, expected_hash, {200})
        finally:
            try:
                context.close()
            except Exception:
                pass

    context = launch_profile(pw, root / "shared-paths-warm")
    try:
        page = new_page(context, "shared-paths-warm")
        responses = []
        page.on("response", lambda response: responses.append((response.url, response.status)))
        goto_alias(page, responses, urljoin(BASE, "privacy/"), "warm-cache seed /privacy/", "#/privacy", {200})
        goto_alias(
            page,
            responses,
            urljoin(BASE, "privacy?from=shared-link"),
            "warm-cache /privacy with query",
            "#/privacy?from=shared-link",
            {200, 304},
        )

        boot(page)
        route(page, "play/lightup-01@1")
        first, before, _ = move_first_cell(page, "shared-paths move seeds an in-progress puzzle")
        wait_run(page, "lightup-01@1", 1)
        wait_page(
            page,
            "() => Boolean(navigator.serviceWorker?.controller)",
            what="service worker controller",
            timeout_seconds=SW_TIMEOUT,
        )
        check(True, "service worker controls the page before controlled navigation")

        goto_alias(page, responses, urljoin(BASE, "login/"), "controlled directory login", "#/login", {200, 304})
        page.reload(wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        wait_diag(page)
        dismiss_dialog(page)
        check(page.evaluate("location.hash") == "#/login", "refresh keeps the login route")

        route(page, "play/lightup-01@1")
        check(
            current(page)["state"]["cells"][first] != before["state"]["cells"][first],
            "in-progress puzzle survives shared-link navigation",
        )
        stored = read_idb(page, "runs", "lightup-01@1")
        check(stored["rev"] >= 1, "in-progress puzzle revision is unchanged by navigation")

        context.set_offline(True)
        page.goto(urljoin(BASE, "privacy/"), wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        wait_diag(page)
        dismiss_dialog(page)
        check(
            page.evaluate("location.hash") == "#/privacy",
            "offline controlled /privacy/ still opens the privacy route",
        )
        context.set_offline(False)
    finally:
        try:
            context.set_offline(False)
        except Exception:
            pass
        try:
            context.close()
        except Exception:
            pass


def scenario_malformed_draft(pw: Any, root: Path) -> None:
    profile = root / "malformed-draft"
    context = launch_profile(pw, profile)
    try:
        seed = new_page(context, "malformed-draft-seed")
        seed_database(seed, version=1, meta_value={"type": "scene", "people": None})
        seed.close()
        page = new_page(context, "malformed-draft")
        boot(page)
        counts = page.evaluate("AlibiDiagnostics.getCounts()")
        check(counts["quarantined"] == 1, "malformed workshop draft is quarantined")
        check("stored record" in page_text(page).lower(), "quarantined draft is explained in the UI")
        stored = read_idb(page, "meta", "workshop-draft")
        check(stored == {"type": "scene", "people": None}, "malformed draft remains available for recovery")
        route(page, "workshop")
        check(page.locator(".draft-editor").count() == 0, "malformed draft does not open the editor")
        check("could not open" not in page_text(page).lower(), "malformed draft does not crash the app")
    finally:
        try:
            context.close()
        except Exception:
            pass


def scenario_malformed_persisted(pw: Any, root: Path) -> None:
    profile = root / "malformed-persisted"
    context = launch_profile(pw, profile)
    context.add_init_script(
        "Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined });"
    )
    malformed_run_key = "alibi.v1.runs.malformed"
    malformed_run = "{malformed-run"
    malformed_settings_key = "alibi.v1.meta.settings"
    malformed_settings = "{malformed-settings"
    try:
        seed = new_page(context, "malformed-persisted-seed-run")
        seed.goto(SEED_PAGE, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        seed.evaluate(
            "({key, value}) => localStorage.setItem(key, value)",
            {"key": malformed_run_key, "value": malformed_run},
        )
        seed.close()

        page = new_page(context, "malformed-persisted-run")
        boot(page, require_indexeddb=False)
        check(page.evaluate("AlibiDiagnostics.storage") == "local", "malformed fallback uses localStorage")
        check(
            "A saved record is damaged. Export browser data before resetting anything." in page_text(page),
            "malformed persisted run is reported without crashing the app",
        )
        check(
            page.evaluate("(key) => localStorage.getItem(key)", malformed_run_key) == malformed_run,
            "malformed persisted run bytes remain untouched",
        )
        page.close()

        seed = new_page(context, "malformed-persisted-seed-settings")
        seed.goto(SEED_PAGE, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        seed.evaluate(
            "({runKey, settingsKey, settings}) => { localStorage.removeItem(runKey); localStorage.setItem(settingsKey, settings); }",
            {
                "runKey": malformed_run_key,
                "settingsKey": malformed_settings_key,
                "settings": malformed_settings,
            },
        )
        seed.close()

        page = new_page(context, "malformed-persisted-settings")
        boot(page, require_indexeddb=False)
        check(
            "A saved record is damaged. Export browser data before resetting anything." in page_text(page),
            "malformed persisted settings are reported without crashing the app",
        )
        check(
            page.evaluate("(key) => localStorage.getItem(key)", malformed_settings_key)
            == malformed_settings,
            "malformed persisted settings bytes remain untouched",
        )
    finally:
        try:
            context.close()
        except Exception:
            pass


def scenario_newer_database(pw: Any, root: Path) -> None:
    profile = root / "newer-database"
    context = launch_profile(pw, profile)
    try:
        seed = new_page(context, "newer-database-seed")
        seed_database(seed, version=2)
        seed.close()
        page = new_page(context, "newer-database")
        boot(page, require_indexeddb=False)
        check(page.evaluate("AlibiDiagnostics.storage") == "session", "newer IndexedDB refuses fallback writes")
        body = page_text(page).lower()
        check("newer version" in body, "newer IndexedDB refusal is explained in the UI")
        version = page.evaluate(
            """() => new Promise((resolve, reject) => {
              const request = indexedDB.open('alibi-device');
              request.onerror = () => reject(request.error);
              request.onsuccess = () => {
                const db = request.result;
                const value = db.version;
                db.close();
                resolve(value);
              };
            })"""
        )
        check(version == 2, "newer IndexedDB schema remains untouched")
        local_keys = page.evaluate("Object.keys(localStorage)")
        check(not any(str(k).startswith("alibi.v1.") for k in local_keys), "newer refusal creates no competing local save")
    finally:
        try:
            context.close()
        except Exception:
            pass


def run() -> int:
    result: dict[str, Any] = {
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "url": BASE,
        "root": str(ROOT),
        "scope": "fresh persistent Chromium profiles; real-origin DOM, IndexedDB, service worker and browser restart",
        "runtime": runtime_info,
        "checks": [],
        "errors": errors,
        "console": logs,
        "passed": False,
        "scenarioSet": [],
        "fullSuite": False,
    }
    with sync_playwright() as pw:
        # Chromium adds long cache paths beneath profiles; keep them outside long
        # Windows/OneDrive checkout paths. Reports still belong to the checkout.
        profile_root = Path(tempfile.mkdtemp(prefix="alibi-origin-")).resolve()
        try:
            scenarios = [
                scenario_durability,
                scenario_backup_restore,
                scenario_cross_tab,
                scenario_keyboard,
                scenario_offline,
                scenario_shared_paths,
                scenario_malformed_draft,
                scenario_malformed_persisted,
                scenario_newer_database,
            ]
            only = os.environ.get("ALIBI_ONLY")
            if only and only not in ORIGIN_SCENARIOS:
                raise ValueError(f"Unknown ALIBI_ONLY scenario: {only}")
            selected = [scenario.__name__.removeprefix("scenario_") for scenario in scenarios]
            if only:
                selected = [only]
            result["scenarioSet"] = selected
            result["fullSuite"] = selected == list(ORIGIN_SCENARIOS) and not only
            result["scope"] = (
                "fresh persistent Chromium profiles; real-origin DOM, IndexedDB, service worker and browser restart; full scenario set"
                if result["fullSuite"]
                else f"focused origin scenario: {only}"
            )
            for scenario in scenarios:
                if only and scenario.__name__ != f"scenario_{only}":
                    continue
                scenario(pw, profile_root)
            check(not errors, "no uncaught browser page errors")
            result["passed"] = True
        except Exception as exc:
            result["failure"] = f"{type(exc).__name__}: {exc}"
            if active_pages:
                screenshot(active_pages[-1], "failure")
            print(f"FAIL {result['failure']}", flush=True)
        finally:
            if profile_root.parent != Path(tempfile.gettempdir()).resolve() or not profile_root.name.startswith("alibi-origin-"):
                raise RuntimeError("Refusing to remove an unexpected profile path")
            shutil.rmtree(profile_root, ignore_errors=True)
    result["checks"] = checks
    result["errors"] = errors
    result["assertions"] = len(checks)
    result["elapsedSeconds"] = round(time.monotonic() - started, 2)
    result_path = RESULTS / "browser-origin.json"
    result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"REPORT {result_path}", flush=True)
    if not result["passed"]:
        return 1
    print(f"PASS {len(checks)} browser-origin checks in {result['elapsedSeconds']}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
