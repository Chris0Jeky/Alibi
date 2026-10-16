"""Actual launch/return controls with one deliberately scheduled obsolete render.

No fake definitions, saved records or completion states are introduced. Source
mode is labelled separately from actual-origin IndexedDB acceptance.
"""
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_RESULTS', ROOT / 'test-results/house-return'))
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
SOURCE = os.environ.get('ALIBI_HOUSE_SOURCE')


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    cases, failures = [], []
    with sync_playwright() as pw:
        launch = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            launch['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = pw.chromium.launch(**launch)
        try:
            for width in (390, 1440):
                for view in ('desk', 'finder'):
                    context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                    page = context.new_page()
                    page.set_default_timeout(8000)
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    origin = '#/home?ux=house'
                    if view == 'finder':
                        origin += '&view=puzzles&family=binary'
                    try:
                        if SOURCE:
                            page.set_content(Path(SOURCE).read_text(), wait_until='load')
                            page.evaluate('(hash)=>{location.hash=hash}', origin)
                        else:
                            page.goto(URL + '/' + origin, wait_until='domcontentloaded')
                        expect(page.locator('.hx-experience')).to_be_visible()
                        button = page.locator('[data-house-action="play"][data-key="binary-01@1"]').first
                        expect(button).to_be_visible()
                        opener = button.get_attribute('id')
                        assert opener
                        page.evaluate('''() => {
                          const host=AlibiHouseLoader.bridge, navigate=host.navigate;
                          host.navigate=function(...args) {
                            host.navigate=navigate;
                            navigate.apply(this,args);
                            AlibiHouseLoader.afterRender({page:'home'});
                          };
                        }''')
                        button.click()
                        page.locator('#dialog').get_by_role('button', name='Start playing', exact=True).click()
                        page.locator('#cell-0').click()
                        page.wait_for_function('()=>AlibiDiagnostics.getCurrent()?.moves>0')
                        saved = page.evaluate('AlibiDiagnostics.getCurrent()')
                        assert saved['key'] == 'binary-01@1'
                        expect(page.locator('#hx-return a')).to_have_attribute('href', origin)
                        page.screenshot(path=str(OUT / f'{view}-{width}-play.png'), full_page=True)
                        page.locator('#hx-return a').click()
                        page.wait_for_function('''({hash,id})=>location.hash===hash &&
                          document.activeElement?.id===id''', arg={'hash': origin, 'id': opener})
                        page.locator('[data-house-action="play"][data-key="binary-01@1"]').first.click()
                        page.wait_for_function('()=>AlibiDiagnostics.getCurrent()?.key==="binary-01@1"')
                        restored = page.evaluate('AlibiDiagnostics.getCurrent()')
                        for key in ('state', 'undo', 'moves', 'puzzle'):
                            assert restored[key] == saved[key]
                        if not SOURCE:
                            assert page.evaluate('AlibiDiagnostics.getStatus().mode') == 'indexeddb'
                        expect(page.locator('#hx-return a')).to_have_attribute('href', origin)
                        assert not errors, errors
                        cases.append({'width': width, 'view': view, 'passed': True})
                    except Exception as error:
                        failures.append({'width': width, 'view': view, 'error': str(error), 'url': page.url, 'pageErrors': errors})
                        page.screenshot(path=str(OUT / f'failure-{view}-{width}.png'), full_page=True)
                    finally:
                        context.close()
        finally:
            browser.close()
    result = {
        'mode': 'source-set-content' if SOURCE else 'built-origin-indexeddb',
        'checkoutControllerSha256': hashlib.sha256((ROOT / 'src/house/controller.js').read_bytes()).hexdigest(),
        'sourceHtmlSha256': hashlib.sha256(Path(SOURCE).read_bytes()).hexdigest() if SOURCE else None,
        'cases': cases, 'failures': failures, 'passed': len(cases) == 4 and not failures,
        'scope': 'Actual controls with a forced stale callback; not physical-device or full-suite acceptance.',
    }
    (OUT / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2), flush=True)
    if not result['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
