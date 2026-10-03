"""Real UI/IndexedDB with held delivery of the actual compiled Vault definitions.

Service workers are blocked only in these controlled-network scenarios so they
cannot mask a held request. Full repository/Vault tests own service-worker and
offline acceptance. This is not physical-device evidence.
"""
import importlib.util
import json
import os
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/deferred-loading'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
PUZZLE = json.loads((ROOT / 'content/extra/vault-binary.json').read_text())['puzzles'][0]
PATTERN = re.compile(r'.*/assets/official-deferred\.[a-f0-9]{12}\.js$')


def driver():
    spec = importlib.util.spec_from_file_location(
        'deferred_controls_driver', ROOT / 'tests/browser_master_grandmaster_controls.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    cases = []
    control = driver()
    assets = list((ROOT / 'dist/assets').glob('official-deferred.*.js'))
    assert len(assets) == 1, 'exercise exactly the current built definition asset'
    payload = assets[0].read_bytes()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            for width in (390, 1280):
                for scenario in ('leave-and-resume', 'timeout-and-retry'):
                    context = browser.new_context(viewport={'width': width, 'height': 900},
                                                  reduced_motion='reduce', service_workers='block')
                    page = context.new_page()
                    page.set_default_timeout(20000)
                    held, errors = [], []
                    page.route(PATTERN, lambda route: held.append(route))
                    page.on('pageerror', lambda error: errors.append(str(error)))

                    def wait_held(count):
                        for _ in range(100):
                            if len(held) >= count:
                                return
                            page.wait_for_timeout(50)
                        raise AssertionError(f'Expected {count} held requests, saw {len(held)}')
                    try:
                        page.goto(URL + '/#/library/binary', wait_until='domcontentloaded')
                        page.wait_for_function('()=>!!globalThis.AlibiDiagnostics')
                        assert page.evaluate('AlibiDiagnostics.getStatus().mode') == 'indexeddb'
                        page.locator('input[type="search"]').first.fill(PUZZLE['title'])
                        card = page.locator(f'[id="library-card-{PUZZLE["id"]}@{PUZZLE["revision"]}"]')
                        expect(card).to_be_visible()
                        card.click()
                        expect(page.locator('h1[role="status"]')).to_be_visible()
                        assert page.evaluate('AlibiDiagnostics.getCurrent()') is None
                        assert page.evaluate('AlibiDiagnostics.getCounts().records') == 0
                        assert not page.locator('.board-card').count()
                        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                        wait_held(1)
                        expect(page.locator('h1[role="status"]')).to_have_text('Opening puzzle…')
                        assert len(held) == 1, 'idle and explicit request share one load'
                        page.screenshot(path=str(OUT / f'{scenario}-pending-{width}.png'), full_page=True)

                        if scenario == 'leave-and-resume':
                            page.get_by_role('link', name='Back to puzzles', exact=True).press('Enter')
                            expect(page.locator('input[type="search"]').first).to_be_visible()
                            held[0].fulfill(status=200, content_type='text/javascript', body=payload)
                            page.wait_for_function('()=>ALIBI_DEFERRED.ready')
                            assert page.evaluate('AlibiDiagnostics.getCurrent()') is None
                            assert page.evaluate('AlibiDiagnostics.getCounts().records') == 0
                            assert not page.locator('dialog[open]').count()
                            cases.append({'width': width, 'case': 'pending-navigation-rejects-late-open'})
                            page.locator('input[type="search"]').first.fill(PUZZLE['title'])
                            page.locator(f'[id="library-card-{PUZZLE["id"]}@1"]').click()
                        else:
                            dialog = page.locator('dialog[open]')
                            expect(dialog).to_contain_text('has not downloaded yet', timeout=15000)
                            assert page.evaluate('AlibiDiagnostics.getCurrent()') is None
                            assert page.evaluate('AlibiDiagnostics.getCounts().records') == 0
                            assert page.locator('script[src*="official-deferred"]').count() == 0
                            held[0].abort()
                            dialog.locator('[data-action="open"]').click()
                            expect(page.locator('h1[role="status"]')).to_be_visible()
                            page.wait_for_function('()=>!!document.querySelector("script[src*=official-deferred]")')
                            wait_held(2)
                            assert len(held) == 2
                            held[1].fulfill(status=200, content_type='text/javascript', body=payload)
                            cases.append({'width': width, 'case': 'timeout-releases-and-real-retry-recovers'})

                        page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=PUZZLE['id'])
                        control.dismiss_lesson(page)
                        expect(page.locator('.board-card')).to_be_visible()
                        assert page.evaluate('AlibiDiagnostics.getCurrent().puzzle') == PUZZLE
                        control.mutate_once(page, PUZZLE)
                        page.wait_for_function('()=>AlibiDiagnostics.getCurrent().moves>0')
                        saved = page.evaluate('AlibiDiagnostics.getCurrent()')
                        page.evaluate("location.hash='/home'")
                        page.wait_for_function('()=>AlibiDiagnostics.getCurrent()===null && !AlibiDiagnostics.getStatus().pendingSaves')
                        page.goto(URL + '/#/play/' + PUZZLE['id'], wait_until='domcontentloaded')
                        page.wait_for_function('(id)=>globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id===id', arg=PUZZLE['id'], timeout=5000)
                        resumed = page.evaluate('AlibiDiagnostics.getCurrent()')
                        assert resumed['state'] == saved['state']
                        assert resumed['moves'] == saved['moves']
                        assert resumed['puzzle'] == saved['puzzle']
                        assert page.evaluate('AlibiDiagnostics.getStatus().mode') == 'indexeddb'
                        assert page.evaluate('ALIBI_DEFERRED.ready') is False, 'resume uses pinned save, not completed download'
                        page.screenshot(path=str(OUT / f'{scenario}-resumed-{width}.png'), full_page=True)
                        cases.append({'width': width, 'case': scenario + '-pinned-save-resumes-with-held-network'})
                        assert not errors, errors
                        print(json.dumps(cases[-2:]), flush=True)
                    except Exception:
                        page.screenshot(path=str(OUT / f'failure-{scenario}-{width}.png'), full_page=True)
                        raise
                    finally:
                        context.close()
        finally:
            browser.close()
    assert len(cases) == 8
    (OUT / 'results.json').write_text(json.dumps({
        'mode': 'built-origin-real-indexeddb-controlled-definition-delivery',
        'serviceWorkers': 'blocked for network control; full origin suite owns offline coverage',
        'physicalDevice': False, 'cases': cases,
    }, indent=2) + '\n')
    print('8 deferred-loading control scenarios passed', flush=True)


if __name__ == '__main__':
    run()
