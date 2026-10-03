"""Actual shelf download, existing Workshop import and saved offline play.

Native chooser automation is not physical Android file-picker acceptance.
"""
import hashlib
import importlib.util
import json
import os
import traceback
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/workshop-discovery'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
POLICY = json.loads((ROOT / 'content/workshop/catalogue.json').read_text())


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('shelf_driver', ROOT / 'tests/browser_master_grandmaster_controls.py')
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    checks, failures = [], []
    launch = {'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('ALIBI_BROWSER_EXECUTABLE'):
        launch['executable_path'] = os.environ['ALIBI_BROWSER_EXECUTABLE']
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        try:
            for width in (320, 1280):
                context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(20000)
                requests, errors = [], []
                context.on('request', lambda request: requests.append(request.url))
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(URL + '/#/workshop')
                    page.wait_for_function('()=>navigator.serviceWorker.controller && globalThis.AlibiDiagnostics?.getStatus().offlineReady', timeout=45000)
                    page.get_by_role('button', name='Puzzle packs', exact=True).click()
                    link = page.get_by_role('link', name='Browse optional collections (new tab)', exact=True)
                    expect(link).to_be_visible()
                    assert not any('/assets/workshop/' in url or '/collections/' in url for url in requests), 'no automatic shelf/data fetch'
                    before = page.evaluate('AlibiDiagnostics.getCounts()')
                    with context.expect_page() as opened:
                        link.press('Enter')
                    shelf = opened.value
                    shelf.wait_for_load_state('domcontentloaded')
                    assert shelf.evaluate('opener === null')
                    assert shelf.locator('script').count() == 0
                    expect(shelf.get_by_role('heading', name='A download is not an installation.', exact=True)).to_be_visible()
                    assert shelf.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    for node in shelf.locator('a.button, summary').all():
                        assert node.bounding_box()['height'] >= 44
                    shelf.screenshot(path=str(OUT / f'shelf-{width}.png'), full_page=True)
                    assert page.evaluate('AlibiDiagnostics.getCounts()') == before
                    page.locator('#pack-input').set_input_files([])
                    assert page.evaluate('AlibiDiagnostics.getCounts()') == before
                    checks.append({'width': width, 'case': 'explicit-keyboard-entry-no-auto-install'})
                    total = 0
                    for entry in POLICY['collections']:
                        name = entry['id'].capitalize()
                        with shelf.expect_download() as download:
                            shelf.get_by_role('link', name=f'Download {name} JSON', exact=True).click()
                        download = download.value
                        assert download.failure() is None
                        destination = OUT / f"{entry['id']}-{width}.json"
                        download.save_as(destination)
                        data = destination.read_bytes()
                        assert hashlib.sha256(data).hexdigest() == entry['sha256']
                        assert data == (ROOT / 'content/workshop' / entry['source']).read_bytes()
                        pack = json.loads(data)
                        assert page.evaluate('AlibiDiagnostics.getCounts()') == before, 'download cannot install'
                        with page.expect_file_chooser() as chooser:
                            page.get_by_role('button', name='Choose a JSON pack', exact=True).click()
                        chooser.value.set_files(str(destination))
                        expect(page.locator('dialog[open]')).to_contain_text(f"{len(pack['puzzles'])} verified puzzles", timeout=45000)
                        page.get_by_role('button', name='Keep browsing', exact=True).click()
                        total += len(pack['puzzles'])
                        installed = page.evaluate('AlibiDiagnostics.getCounts()')
                        assert installed['puzzles'] == before['puzzles'] + len(pack['puzzles'])
                        page.locator('#pack-input').set_input_files(str(destination))
                        expect(page.locator('#toasts')).to_contain_text('already installed', timeout=45000)
                        expect(page.locator('dialog[open]')).to_have_count(0)
                        assert page.evaluate('AlibiDiagnostics.getCounts()') == installed
                        checks.append({'width': width, 'case': entry['id'] + '-exact-download-import-duplicate-refusal'})
                        # One study per delivered family; the existing Lattice/Afterlight
                        # suites retain every-board completion coverage.
                        examples = {puzzle['type']: puzzle for puzzle in reversed(pack['puzzles'])}
                        for puzzle in examples.values():
                            page.goto(URL + f"/#/play/{puzzle['id']}@1")
                            page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=puzzle['id'])
                            driver.dismiss_lesson(page)
                            expect(page.locator('.board-card')).to_be_visible()
                            initial = driver.current(page)['state']
                            driver.mutate_once(page, puzzle)
                            changed = driver.current(page)['state']
                            assert changed != initial
                            driver.action(page, 'undo')
                            assert driver.current(page)['state'] == initial
                            driver.action(page, 'redo')
                            assert driver.current(page)['state'] == changed
                            page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                            saved = driver.current(page)
                            context.set_offline(True)
                            page.reload()
                            page.wait_for_function('(id)=>globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id===id', arg=puzzle['id'], timeout=30000)
                            restored = driver.current(page)
                            assert restored['state'] == saved['state'] and restored['moves'] == saved['moves']
                            assert restored['puzzle'] == saved['puzzle']
                            assert page.evaluate('AlibiDiagnostics.getStatus().mode') == 'indexeddb'
                            page.screenshot(path=str(OUT / f"{puzzle['type']}-offline-{width}.png"))
                            context.set_offline(False)
                            checks.append({'width': width, 'case': puzzle['type'] + '-real-controls-undo-redo-offline-resume'})
                        page.goto(URL + '/#/workshop')
                        page.get_by_role('button', name='Puzzle packs', exact=True).click()
                        before = page.evaluate('AlibiDiagnostics.getCounts()')
                    assert total == 34
                    assert not errors, errors
                    shelf.close()
                    plain = browser.new_context(java_script_enabled=False, viewport={'width': 844, 'height': 390})
                    try:
                        static = plain.new_page()
                        static.goto(URL + '/collections/index.html')
                        expect(static.get_by_role('link', name='Download Afterlight JSON', exact=True)).to_be_visible()
                        static.screenshot(path=str(OUT / f'no-script-landscape-{width}.png'), full_page=True)
                    finally:
                        plain.close()
                    checks.append({'width': width, 'case': 'script-free-landscape'})
                except Exception as error:
                    failures.append({'width': width, 'error': str(error), 'traceback': traceback.format_exc()})
                    page.screenshot(path=str(OUT / f'failure-{width}.png'), full_page=True)
                finally:
                    context.close()
        finally:
            browser.close()
    if len(checks) != 14:
        failures.append({'coverage': len(checks), 'expected': 14})
    receipt = {'sourceHead': os.environ.get('EXPECTED_HEAD', 'local-reconstructed-source'),
               'browser': launch.get('executable_path', 'pinned-playwright-chromium'),
               'passed': not failures, 'checks': checks, 'failures': failures,
               'scope': 'Actual built origin and IndexedDB; no physical device, installed native picker or human difficulty claim.'}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt, indent=2), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
