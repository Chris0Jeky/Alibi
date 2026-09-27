"""Import and play the optional Lattice pack through the existing Workshop UI."""
import hashlib
import importlib.util
import json
import os
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'content/workshop/lattice-studies.json'
OUT = ROOT / 'test-results/lattice-controls'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
WIDTHS = (390, 1440)


def run():
    pack = json.loads(PACK.read_text(encoding='utf-8'))
    puzzles = pack['puzzles']
    assert len(puzzles) == 24 and len({p['id'] for p in puzzles}) == 24
    spec = importlib.util.spec_from_file_location(
        'lattice_driver', ROOT / 'tests/browser_master_grandmaster_controls.py'
    )
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    OUT.mkdir(parents=True, exist_ok=True)
    checks, failures = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
            try:
                for width in WIDTHS:
                    context = browser.new_context(
                        viewport={'width': width, 'height': 1000}, reduced_motion='reduce'
                    )
                    try:
                        page = context.new_page()
                        page.set_default_timeout(15000)
                        page_errors = []
                        page.on('pageerror', lambda error: page_errors.append(str(error)))
                        page.goto(URL + '/#/workshop')
                        page.wait_for_function(
                            '() => navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady',
                            timeout=30000,
                        )
                        page.locator('[data-action="work-tab"][data-value="packs"]').click()
                        page.locator('#pack-input').set_input_files(str(PACK))
                        expect(page.locator('dialog[open]')).to_contain_text(
                            'A new collection is ready.', timeout=45000
                        )
                        expect(page.locator('dialog[open]')).to_contain_text('24 verified puzzles')
                        driver.dismiss_lesson(page)
                        checks.append(f'{width}px: production Workshop imports all 24 studies')
                        for puzzle in puzzles:
                            try:
                                page.goto(URL + f'/#/play/{puzzle["id"]}@1')
                                page.wait_for_function(
                                    '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id',
                                    arg=puzzle['id'],
                                )
                                driver.dismiss_lesson(page)
                                expect(page.locator('.board-card')).to_be_visible()
                                if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                                    raise AssertionError('Horizontal page overflow')
                                driver.probe_geometry(page, puzzle, checks)
                                before = driver.current(page)['state']
                                driver.mutate_once(page, puzzle)
                                changed = driver.current(page)['state']
                                assert changed != before, 'Real controls did not change the board'
                                driver.action(page, 'undo')
                                assert driver.current(page)['state'] == before
                                driver.action(page, 'redo')
                                assert driver.current(page)['state'] == changed
                                driver.action(page, 'restart')
                                expect(page.locator('dialog[open]')).to_be_visible()
                                assert driver.current(page)['state'] == changed
                                driver.action(page, 'restart-confirm')
                                page.wait_for_function(
                                    '(state) => JSON.stringify(AlibiDiagnostics.getCurrent()?.state) === JSON.stringify(state)',
                                    arg=before,
                                )
                                page.screenshot(path=str(OUT / f'{puzzle["id"]}-{width}-start.png'))
                                driver.solve(page, puzzle)
                                page.wait_for_function(
                                    '() => AlibiDiagnostics.getCurrent()?.completedAt && AlibiDiagnostics.getStatus().pendingSaves === 0',
                                    timeout=30000,
                                )
                                status = page.evaluate('AlibiDiagnostics.getStatus()')
                                assert status['mode'] == 'indexeddb' and not status['saveError']
                                saved = driver.current(page)
                                page.screenshot(path=str(OUT / f'{puzzle["id"]}-{width}-complete.png'))
                                context.set_offline(True)
                                try:
                                    page.reload()
                                    page.wait_for_function(
                                        '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id',
                                        arg=puzzle['id'], timeout=30000,
                                    )
                                    restored = driver.current(page)
                                    assert restored['state'] == saved['state']
                                    assert restored['completedAt'] == saved['completedAt']
                                finally:
                                    context.set_offline(False)
                                checks.append(f'{width}px {puzzle["id"]}: undo, redo, confirmed restart, solve, save and offline reopen')
                            except Exception as error:
                                failures.append({'width': width, 'id': puzzle['id'],
                                                 'error': str(error), 'traceback': traceback.format_exc()})
                        if page_errors:
                            failures.append({'width': width, 'pageErrors': page_errors})
                    finally:
                        context.close()
            finally:
                browser.close()
    except Exception as error:
        failures.append({'scenario': 'setup-or-import', 'error': str(error),
                         'traceback': traceback.format_exc()})
    expected = len(WIDTHS) * len(puzzles)
    completed = sum(': undo, redo, confirmed restart, solve, save and offline reopen' in check for check in checks)
    if completed != expected:
        failures.append({'scenario': 'coverage', 'completed': completed, 'expected': expected})
    receipt = {'passed': not failures, 'sourceHead': os.environ.get('EXPECTED_HEAD', 'unrecorded'),
               'packSha256': hashlib.sha256(PACK.read_bytes()).hexdigest(), 'widths': list(WIDTHS),
               'puzzles': [p['id'] for p in puzzles], 'checks': checks, 'failures': failures,
               'scope': 'Real Workshop import and DOM controls; not human calibration or physical-device acceptance.'}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'passed': not failures, 'completed': completed, 'failures': failures[:3]}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
