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
    "malformed_draft",
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
    counts = page.evaluate("AlibiDiagnostics.getCounts()")
    check(counts["puzzles"] == 324, "real-origin catalogue has 324 puzzles")
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


def scenario_keyboard(pw: Any, root: Path) -> None:
    profile = root / "keyboard"
    context = launch_profile(pw, profile)
    try:
        page = new_page(context, "keyboard")
        boot(page)
        keyboard_family(page, "lightup-01", "lightup keyboard")
        keyboard_family(page, "tents-01", "tents keyboard")
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
                scenario_malformed_draft,
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
