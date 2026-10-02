"""Real-origin, two-release service-worker acceptance for the Alibi PWA.

This acceptance test deliberately
does not build or modify the checkout: it copies ``dist`` into disposable
release directories, makes a labelled synthetic release B, and serves A then B
from the same loopback origin and port.  Run it with the repository's virtual
environment, for example::

    python tests/browser_update.py

Set ``ALIBI_ROOT`` when the checkout is elsewhere.  The report is written to
``$ALIBI_ROOT/test-results/browser-update/results.json``.
"""

from __future__ import annotations

import hashlib
import http.server
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
import tempfile
import threading
import time
import traceback
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_ROOT = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get("ALIBI_ROOT", str(DEFAULT_ROOT))).resolve()
REPORT_PATH = ROOT / "test-results" / "browser-update" / "results.json"


class MutableStaticServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, root: Path):
        self.root = root.resolve()
        super().__init__(("127.0.0.1", 0), MutableStaticHandler)


class MutableStaticHandler(http.server.BaseHTTPRequestHandler):
    """Small static handler whose release root can change without changing origin."""

    server_version = "AlibiUpdateFixture/1"
    protocol_version = "HTTP/1.0"

    def log_message(self, *_args):
        return

    def do_GET(self):  # noqa: N802 - stdlib handler API
        self._serve(False)

    def do_HEAD(self):  # noqa: N802 - stdlib handler API
        self._serve(True)

    def _serve(self, head: bool):
        root = self.server.root.resolve()
        request_path = unquote(urlsplit(self.path).path)
        if request_path in ("", "/"):
            request_path = "/index.html"
        candidate = (root / request_path.lstrip("/")).resolve()
        if root != candidate and root not in candidate.parents:
            self.send_error(403)
            return
        if not candidate.is_file():
            self.send_error(404)
            return
        body = candidate.read_bytes()
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        # The real deployment marks the update boundary as no-cache.  This
        # keeps the fixture honest while the service worker switches roots.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()
        if not head:
            self.wfile.write(body)


def check(value: bool, label: str, checks: list[str]) -> None:
    if not value:
        raise AssertionError(label)
    checks.append(label)
    print(f"PASS {label}", flush=True)


def make_releases() -> tuple[tempfile.TemporaryDirectory, Path, Path]:
    """Copy the current built dist and create an internally coherent fixture B."""

    dist = ROOT / "dist"
    if not dist.is_dir() or not (dist / "index.html").is_file() or not (dist / "sw.js").is_file():
        raise FileNotFoundError(f"Built dist is required: {dist}")
    results_dir = ROOT / "test-results"
    results_dir.mkdir(parents=True, exist_ok=True)
    temp = tempfile.TemporaryDirectory(prefix="alibi-update-", dir=str(results_dir))
    fixture_root = Path(temp.name)
    release_a = fixture_root / "release-a"
    release_b = fixture_root / "release-b"
    shutil.copytree(dist, release_a)
    shutil.copytree(dist, release_b)

    a_assets = sorted((release_a / "assets").glob("alibi.*.js"))
    b_assets = sorted((release_b / "assets").glob("alibi.*.js"))
    if len(a_assets) != 1 or len(b_assets) != 1:
        temp.cleanup()
        raise AssertionError("Expected exactly one hashed application JavaScript asset")
    old_js_name = a_assets[0].name
    old_js_ref = f"./assets/{old_js_name}"
    old_js = b_assets[0].read_text(encoding="utf-8")
    prefix = "globalThis.ALIBI_CONFIG="
    config_lines = list(re.finditer(r"^globalThis\.ALIBI_CONFIG=(.+);$", old_js, re.MULTILINE))
    if len(config_lines) != 1:
        temp.cleanup()
        raise AssertionError("Expected exactly one built ALIBI_CONFIG line")
    config_line = config_lines[0]
    config = json.loads(config_line.group(1))
    original_build = config["build"]
    # This label intentionally makes the synthetic release obvious in reports
    # and in the player-facing footer/settings screen.
    config.update({"version": f"{config['version']}-test-fixture-b", "build": "fixture-b"})
    changed_js = (old_js[:config_line.start()] + prefix
                  + json.dumps(config, separators=(",", ":")) + ";"
                  + old_js[config_line.end():])
    new_js_name = f"alibi.{hashlib.sha256(changed_js.encode('utf-8')).hexdigest()[:12]}.js"
    new_js = release_b / "assets" / new_js_name
    b_assets[0].unlink()
    new_js.write_text(changed_js, encoding="utf-8")

    index_path = release_b / "index.html"
    index = index_path.read_text(encoding="utf-8")
    if old_js_ref not in index:
        temp.cleanup()
        raise AssertionError("Release B shell did not reference release A JavaScript")
    index_path.write_text(index.replace(old_js_ref, f"./assets/{new_js_name}"), encoding="utf-8")

    sw_path = release_b / "sw.js"
    sw = sw_path.read_text(encoding="utf-8")
    sw = re.sub(
        rf'const BUILD="{re.escape(original_build)}"',
        'const BUILD="fixture-b"',
        sw,
        count=1,
    )
    sw = sw.replace(old_js_ref, f"./assets/{new_js_name}")
    if (
        'const BUILD="fixture-b"' not in sw
        or f"./assets/{new_js_name}" not in sw
        or old_js_ref in sw
    ):
        temp.cleanup()
        raise AssertionError("Release B service-worker shell is not coherent")
    sw_path.write_text(sw, encoding="utf-8")
    return temp, release_a, release_b


def wait_for_app(page, version: str | None = None) -> None:
    page.wait_for_function('() => (window.AlibiDiagnostics && AlibiDiagnostics.getCurrent())')
    page.wait_for_function("() => (AlibiDiagnostics.getStatus().mode === 'indexeddb')")
    if version:
        page.wait_for_function(
            "(expected) => window.ALIBI_CONFIG?.version === expected", arg=version
        )


def dismiss_lesson(page) -> None:
    dialog = page.locator("dialog[open]")
    if dialog.count():
        finish = dialog.locator('[data-action="lesson-finish"]')
        if finish.count():
            finish.click()
        else:
            close = dialog.locator('[data-action="close-dialog"]')
            if close.count():
                close.click()
        page.wait_for_function("() => (!document.querySelector('dialog[open]'))")


def current(page) -> dict:
    value = page.evaluate("AlibiDiagnostics.getCurrent()")
    if not value:
        raise AssertionError("No current puzzle run")
    return value


def make_sudoku_move(page, expected_moves: int) -> dict:
    before = current(page)
    puzzle = before["puzzle"]
    state = before["state"]
    index = next(
        i
        for i, given in enumerate(puzzle["givens"])
        if not given and state["cells"][i] == 0
    )
    value = puzzle["solution"][index]
    page.locator(f'[data-action="cell"][data-cell="{index}"]').click()
    page.locator(f'[data-action="value"][data-value="{value}"]').click()
    page.wait_for_function(
        "(moves) => AlibiDiagnostics.getCurrent()?.moves === moves", arg=expected_moves
    )
    page.wait_for_function(
        "() => (document.querySelector('#save-state')?.textContent.includes('Saved on this device'))"
    )
    return current(page)


def update_pause_setup(page, server, release_a, release_b, route):
    server.root = release_a
    base = f'http://127.0.0.1:{server.server_address[1]}'
    page.goto(base + '/#/play/sudoku-01@1')
    page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()')
    dismiss_lesson(page)
    page.wait_for_function('()=>AlibiDiagnostics.getStatus().offlineReady')
    if not page.evaluate('!!navigator.serviceWorker.controller'):
        page.reload()
        page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()')
        dismiss_lesson(page)
    page.evaluate('(route)=>location.hash=route', route)
    if '/quiet/' in route:
        page.wait_for_function('()=>AlibiActivities.diagnostics().active && window.QWApp?.state')
        page.wait_for_selector('#realmname')
        page.evaluate('()=>QWApp.flush()')
    elif '/salon/archive' in route:
        page.wait_for_selector('[data-action="club-walk"][data-value="right"]')
        page.evaluate('()=>AlibiClub.flush()')
    else:
        page.wait_for_function('()=>AlibiDiagnostics.getCurrent()?.puzzle.type==="sudoku"')
        dismiss_lesson(page)
        page.locator('[data-action="evidence-tab"][data-value="notes"]').click()
        page.wait_for_selector('#play-notes')
    server.root = release_b
    page.evaluate('async ()=>{const r=await navigator.serviceWorker.ready;await r.update()}')
    page.wait_for_function('async ()=>!!(await navigator.serviceWorker.getRegistration())?.waiting')
    page.wait_for_selector('[data-action="apply-update"]')
    assert page.evaluate('!!navigator.serviceWorker.controller')
    assert page.evaluate('AlibiDiagnostics.getStatus().mode') == 'indexeddb'
    page.evaluate('''()=>{
      window.probeGate={entered:false};
      const original=AlibiActivities.flush.bind(AlibiActivities);
      probeGate.original=original;
      const gate=new Promise((resolve,reject)=>Object.assign(probeGate,{resolve,reject}));
      AlibiActivities.flush=async()=>{await original();probeGate.entered=true;await gate};
    }''')
    page.locator('[data-action="apply-update"]').first.click()
    page.wait_for_function('()=>probeGate.entered')
    return base

def update_pause_raw_click(page, locator):
    locator.scroll_into_view_if_needed()
    box = locator.bounding_box()
    assert box, 'Probe control must have a real rendered box'
    page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)

def update_pause_frozen(page, locator):
    return locator.evaluate('''el=>{
      for(let node=el;node;node=node.parentElement || node.getRootNode()?.host){
        if(node.inert)return true;
      }return false;
    }''')

def update_pause_state(page, case):
    if case == 'club':
        return page.evaluate('AlibiClub.diagnostics().state.runs.archive.log')
    if case == 'wing':
        return page.evaluate('QWApp.state.scene.name')
    return page.evaluate('AlibiDiagnostics.getCurrent().note')

def update_pause_edit_field(page, locator, text):
    # Native typing must not focus an inert ancestor, including a shadow host.
    if update_pause_frozen(page, locator):
        update_pause_raw_click(page, locator)
        page.keyboard.type(text)
        page.keyboard.press('Tab')
    else:
        locator.fill(text)
        locator.press('Tab')

def update_pause_probe_case(pw, server, release_a, release_b, case):
    route = {'club':'#/salon/archive', 'wing':'#/quiet/realm', 'notes':'#/play/sudoku-01@1'}[case]
    with tempfile.TemporaryDirectory(prefix='p-', dir=str(ROOT)) as profile:
        launch = {'headless':True, 'args':['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            launch['executable_path'] = os.environ['CHROMIUM_PATH']
        context = pw.chromium.launch_persistent_context(profile, viewport={'width':1440,'height':1000}, **launch)
        try:
            page = context.pages[0]
            page.set_default_timeout(15000)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            base = update_pause_setup(page, server, release_a, release_b, route)
            version = page.evaluate('ALIBI_CONFIG.version')
            assert page.locator('.banner[role="status"]').filter(has_text='Controls are paused').is_visible()
            before = update_pause_state(page, case)
            if case == 'club':
                update_pause_raw_click(page, page.locator('[data-action="club-walk"][data-value="right"]').first)
                after_click = update_pause_state(page, case)
                page.locator('body').click(position={'x':2,'y':2})
                page.keyboard.press('ArrowRight')
                after = update_pause_state(page, case)
            else:
                field = page.locator('#realmname' if case=='wing' else '#play-notes')
                if not field.count() and case=='notes':
                    field=page.locator('#quick-notes')
                assert field.count(), f'{case} field must exist'
                update_pause_edit_field(page, field, 'late update probe')
                after_click = None
                after = update_pause_state(page, case)
            page.screenshot(path=str(REPORT_PATH.parent / f'update-pause-{case}.png'), full_page=True)
            # Reject while the real waiting worker is still waiting: app must undo all pauses.
            page.evaluate('()=>probeGate.reject(Error("probe save failure"))')
            page.wait_for_function('()=>!document.querySelector("#main")?.inert && !document.querySelector("#quiet-host")?.inert')
            page.wait_for_timeout(150)
            assert page.evaluate('ALIBI_CONFIG.version') == version, 'Rejected save must not reload release B'
            assert page.evaluate('async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting'), 'Rejected save must not ACTIVATE'
            preserved = update_pause_state(page,case)
            assert preserved == after, 'Failure recovery must preserve current data'
            if case=='club':
                control = '[data-action="club-undo"][data-id="archive"]' if preserved else '[data-action="club-walk"][data-value="right"]'
                update_pause_raw_click(page,page.locator(control).first)
                resumed=update_pause_state(page,case)
                assert resumed != preserved, 'Club controls must work after rejection'
                page.evaluate('()=>AlibiClub.flush()')
            else:
                field=page.locator('#realmname' if case=='wing' else '#play-notes')
                if not field.count():field=page.locator('#quick-notes')
                assert not update_pause_frozen(page,field), 'Fields must become interactive after rejection'
                update_pause_edit_field(page,field,'recovered update probe')
                resumed=update_pause_state(page,case)
                assert resumed=='recovered update probe','Field must work after rejection'
                page.wait_for_timeout(300)
                if case=='wing':page.evaluate('()=>QWApp.flush()')
            page.reload()
            if case=='wing':page.wait_for_function('()=>window.QWApp?.state')
            elif case=='club':page.wait_for_function('()=>window.AlibiClub?.diagnostics().state.runs.archive')
            else:page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()')
            assert update_pause_state(page,case)==resumed, 'Recovered edits must survive reload'
            assert not errors, errors
            return {'case':case,'setup':'real controlled SW, real waiting B, real IndexedDB, completed activities flush held',
                    'before':before,'after_click':after_click,'after':after,'frozen':after==before,
                    'recovery':'unpaused, no activation, current data retained, resumed edit survives reload', 'errors':errors}
        finally:
            context.close()

def update_pause_controller_recovery(pw, server, release_a, release_b):
    with tempfile.TemporaryDirectory(prefix='p-', dir=str(ROOT)) as profile:
        launch = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            launch['executable_path'] = os.environ['CHROMIUM_PATH']
        context = pw.chromium.launch_persistent_context(profile, viewport={'width': 1440, 'height': 1000}, **launch)
        try:
            page = context.pages[0]
            page.set_default_timeout(15000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            update_pause_setup(page, server, release_a, release_b, '#/salon/archive')
            version = page.evaluate('ALIBI_CONFIG.version')
            before = update_pause_state(page, 'club')
            # Let the first save finish and activate B, then reject the controllerchange flush.
            page.evaluate('''()=>{
              AlibiActivities.flush=async()=>{throw Error('probe controller save failure')};
              probeGate.resolve();
            }''')
            page.wait_for_function('()=>!document.querySelector("#main")?.inert')
            page.wait_for_function('()=>document.querySelector("#toasts")?.textContent.includes("probe controller save failure")')
            assert page.evaluate('ALIBI_CONFIG.version') == version, 'Failed final flush must not reload the document'
            assert not page.evaluate('async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting'), 'B must have activated to exercise controllerchange'
            assert update_pause_state(page, 'club') == before, 'Final flush failure must preserve replay'
            # Retry with no waiting worker: the request must release both input pauses.
            page.evaluate('()=>AlibiActivities.flush=probeGate.original')
            page.locator('[data-action="apply-update"]').first.click()
            page.wait_for_function('()=>!document.querySelector("#main")?.inert')
            assert page.evaluate('ALIBI_CONFIG.version') == version, 'No waiting worker must not reload'
            update_pause_raw_click(page, page.locator('[data-action="club-walk"][data-value="right"]').first)
            assert update_pause_state(page, 'club') != before, 'Club pause must release after no-worker retry'
            page.evaluate('()=>AlibiClub.flush()')
            assert not errors, errors
            return {'case': 'controllerchange', 'passed': True, 'recovery': 'final flush rejection avoids reload; no-worker retry restores controls', 'errors': errors}
        finally:
            context.close()


def run_update_pause_checks() -> dict:
    report = {"passed": False, "cases": []}
    started = time.monotonic()
    fixture = server = None
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        fixture, release_a, release_b = make_releases()
        server = MutableStaticServer(release_a)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        with sync_playwright() as pw:
            for case in ["club", "wing", "notes"]:
                result = update_pause_probe_case(pw, server, release_a, release_b, case)
                report["cases"].append(result)
                assert result["frozen"], f"{case}: native input mutated data during update pause"
                print(f"PASS Update pause and rejection recovery: {case}", flush=True)
            report['cases'].append(update_pause_controller_recovery(pw, server, release_a, release_b))
            print('PASS Controllerchange failure and no-worker recovery', flush=True)
        report["passed"] = True
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"
        report["traceback"] = traceback.format_exc()
        print(f"FAIL Update pause: {report['error']}", flush=True)
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        if fixture is not None:
            fixture.cleanup()
        report["elapsed_seconds"] = round(time.monotonic() - started, 3)
        pause_report_path = REPORT_PATH.with_name("browser-update-pause.json")
        pause_report_path.parent.mkdir(parents=True, exist_ok=True)
        pause_report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"report": str(pause_report_path), **report}, indent=2), flush=True)
    return report


def run() -> dict:
    checks: list[str] = []
    errors: list[str] = []
    started = time.monotonic()
    result: dict = {"passed": False, "checks": checks, "errors": errors}
    fixture_temp = None
    profile_temp = None
    server = None
    browser = None
    context = None
    page = None
    page2 = None
    try:
        fixture_temp, release_a, release_b = make_releases()
        # Chromium's on-disk service-worker paths fail in deeply nested Windows profiles.
        # Keep the disposable profile inside this checkout, but outside the release fixture.
        profile_temp = tempfile.TemporaryDirectory(prefix="p-", dir=str(ROOT))
        server = MutableStaticServer(release_a)
        threading.Thread(target=server.serve_forever, name="alibi-update-server", daemon=True).start()
        base_url = f"http://127.0.0.1:{server.server_address[1]}"
        puzzle_url = f"{base_url}/#/play/sudoku-01@1"
        with sync_playwright() as pw:
            launch = {"headless": True, "args": ["--no-sandbox"]}
            if os.environ.get("CHROMIUM_PATH"):
                launch["executable_path"] = os.environ["CHROMIUM_PATH"]
            browser = pw.chromium.launch_persistent_context(
                profile_temp.name,
                **launch,
                viewport={"width": 390, "height": 900},
                accept_downloads=True,
                reduced_motion="reduce",
            )
            context = browser
            page = context.pages[0] if context.pages else context.new_page()
            page.set_default_timeout(10000)
            page.on("pageerror", lambda error: errors.append(f"page1: {error}"))
            page.goto(puzzle_url, wait_until="domcontentloaded")
            wait_for_app(page)
            dismiss_lesson(page)
            page.wait_for_function('() => (navigator.serviceWorker.ready)')
            page.wait_for_function('() => (AlibiDiagnostics.getStatus().offlineReady === true)')
            if not page.evaluate("!!navigator.serviceWorker.controller"):
                page.reload(wait_until="domcontentloaded")
                wait_for_app(page)
                dismiss_lesson(page)
            check(
                page.evaluate("!!navigator.serviceWorker.controller"),
                "Release A is controlled by a real service worker",
                checks,
            )
            check(
                page.evaluate("AlibiDiagnostics.getStatus().mode") == "indexeddb",
                "Release A uses real IndexedDB storage",
                checks,
            )
            a_config = page.evaluate(
                "() => ({version: ALIBI_CONFIG.version, build: ALIBI_CONFIG.build})"
            )
            a_run = current(page)
            a_puzzle = a_run["puzzle"]
            first_run = make_sudoku_move(page, a_run["moves"] + 1)
            check(first_run["moves"] == 1, "Release A saves the first real puzzle move", checks)

            page2 = context.new_page()
            page2.set_default_timeout(10000)
            page2_errors: list[str] = []
            page2.on("pageerror", lambda error: page2_errors.append(str(error)))
            load_events = [0]
            page2.on("load", lambda _event: load_events.__setitem__(0, load_events[0] + 1))
            page2.goto(puzzle_url, wait_until="domcontentloaded")
            wait_for_app(page2)
            dismiss_lesson(page2)
            page2.wait_for_function('() => (navigator.serviceWorker.ready)')
            page2_loads_before_update = load_events[0]
            check(
                page2.evaluate("ALIBI_CONFIG.version") == a_config["version"],
                "Second tab starts on release A",
                checks,
            )

            server.root = release_b
            page.evaluate(
                """async () => {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.update();
                    return true;
                }"""
            )
            page.wait_for_function(
                "async () => !!(await navigator.serviceWorker.getRegistration())?.waiting"
            )
            page.wait_for_function('() => (AlibiDiagnostics.getStatus().waitingUpdate === true)')
            check(
                page.locator('[data-action="apply-update"]').is_visible(),
                "Release B appears as the actual Save & update banner",
                checks,
            )
            check(
                page.evaluate("ALIBI_CONFIG.version") == a_config["version"],
                "Release A stays active while release B waits",
                checks,
            )
            second_run = make_sudoku_move(page, first_run["moves"] + 1)
            expected_state = second_run["state"]
            check(second_run["moves"] == 2, "Release A saves another move while B waits", checks)
            check(
                page.evaluate("AlibiDiagnostics.getStatus().waitingUpdate === true"),
                "The update banner remains available after the second move",
                checks,
            )

            # This is the app's real activation control.  The page reload is
            # expected only after the user has asked to switch releases.
            page.locator('[data-action="apply-update"]').click(no_wait_after=True)
            page.wait_for_function('() => (window.AlibiDiagnostics && window.ALIBI_CONFIG)')
            wait_for_app(page, f"{a_config['version']}-test-fixture-b")
            page.wait_for_function('() => (!!navigator.serviceWorker.controller)')
            page.wait_for_function('() => (AlibiDiagnostics.getCurrent()?.moves === 2)')
            b_config = page.evaluate(
                "() => ({version: ALIBI_CONFIG.version, build: ALIBI_CONFIG.build})"
            )
            b_run = current(page)
            check(
                b_config["version"] == f"{a_config['version']}-test-fixture-b",
                "Release B is visibly running after Save & update",
                checks,
            )
            check(b_config["build"] == "fixture-b", "Release B config is distinct", checks)
            check(b_run["moves"] == 2 and b_run["state"] == expected_state, "Latest saved state survives the update", checks)
            check(
                b_run["puzzle"] == a_puzzle and b_run["puzzle"]["revision"] == 1,
                "The original revision-pinned puzzle definition is unchanged",
                checks,
            )

            # A second open tab must not be silently reloaded by activation.
            page2.wait_for_timeout(300)
            check(
                load_events[0] == page2_loads_before_update,
                "Second tab is not force-reloaded when B activates",
                checks,
            )
            check(
                page2.url == puzzle_url,
                "Second tab remains on the same puzzle route",
                checks,
            )
            check(
                page2.evaluate("ALIBI_CONFIG.version") == a_config["version"],
                "Second tab keeps its existing A document until the player reloads",
                checks,
            )

            page2.reload(wait_until="domcontentloaded")
            wait_for_app(page2, f"{a_config['version']}-test-fixture-b")
            page2.wait_for_function('() => (AlibiDiagnostics.getCurrent()?.moves === 2)')
            b_run_2 = current(page2)
            check(
                b_run_2["state"] == expected_state,
                "Reloading the second tab reads the latest saved state",
                checks,
            )
            check(
                b_run_2["puzzle"] == a_puzzle,
                "Reloading the second tab preserves the original pinned puzzle",
                checks,
            )
            errors.extend(f"page2: {error}" for error in page2_errors)
            check(not errors, "No uncaught browser page errors", checks)
            result.update(
                {
                    "browser": browser.browser.version,
                    "origin": base_url,
                    "release_a": a_config,
                    "release_b": b_config,
                    "puzzle": {"id": a_puzzle["id"], "revision": a_puzzle["revision"]},
                    "scope": "Real Chromium origin with IndexedDB and service-worker update; two tabs; disposable A/B copies of current dist; no source or dist writes.",
                }
            )
    except Exception as error:  # Keep a durable failure report for the parent.
        result["error"] = f"{type(error).__name__}: {error}"
        result["traceback"] = traceback.format_exc()
        print(f"FAIL {result['error']}", flush=True)
    finally:
        if context is not None:
            try:
                context.close()
            except Exception:
                pass
        if server is not None:
            server.shutdown()
            server.server_close()
        if fixture_temp is not None:
            fixture_temp.cleanup()
        if profile_temp is not None:
            profile_temp.cleanup()
        result["elapsed_seconds"] = round(time.monotonic() - started, 3)
        result["assertions"] = len(checks)
        result["passed"] = "error" not in result
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({"report": str(REPORT_PATH), **result}, indent=2), flush=True)
    return result


if __name__ == "__main__":
    pause_outcome = run_update_pause_checks()
    outcome = run()
    raise SystemExit(0 if pause_outcome["passed"] and outcome["passed"] else 1)
