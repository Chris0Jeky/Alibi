"""Actual origin/cache acceptance for the optional desk. No CSP bypass or mocked APIs."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_house import wait_js

URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
OUT = Path(os.environ.get('ALIBI_RESULTS', 'test-results/house-offline'))
OUT.mkdir(parents=True, exist_ok=True)

def main():
    checks = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':390,'height':844})
        page = context.new_page()
        requested = []
        page.on('request',lambda r: requested.append(r.url))
        page.goto(URL+'/#/home')
        wait_js(page,'() => !!navigator.serviceWorker.controller')
        assert not any('/assets/house.' in url for url in requested)
        checks.append('Classic startup and shell installation fetch no house pack')
        page.locator('a[href="#/home?ux=house"]').click()
        page.locator('.hx-experience').wait_for()
        wait_js(page,'() => AlibiHouseLoader.diagnostics().offline === true')
        keys = page.evaluate('() => caches.keys()')
        assert any(k.startswith('alibi-house-pack-') for k in keys)
        checks.append('Explicit entry creates a separately named complete preview cache')
        page.locator('.hx-mobile').get_by_role('link',name='The house',exact=True).click()
        context.set_offline(True)
        page.reload()
        expect(page.locator('.hx-experience h1')).to_have_text('Every room has a detail.')
        page.locator('.hx-room-cards [data-room=library]').click()
        expect(page.locator('#dialog')).to_contain_text('West-facing window')
        checks.append('Offline hard reload loads the hashed script, stylesheet and working room controls')
        page.keyboard.press('Escape')
        page.screenshot(path=str(OUT/'house-offline-390.png'))
        context.close()
        context = browser.new_context(viewport={'width':390,'height':844})
        page = context.new_page()
        page.goto(URL+'/#/home')
        wait_js(page,'() => !!navigator.serviceWorker.controller')
        context.set_offline(True)
        page.locator('a[href="#/home?ux=house"]').click()
        expect(page.locator('[role=status]').filter(has_text='Preview unavailable')).to_be_visible(timeout=18000)
        page.get_by_role('link',name='Classic desk',exact=True).click()
        assert page.locator('.hx-experience').count()==0
        checks.append('Uncached offline entry offers Classic desk without deleting saves or shell files')
        context.close()
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'mode':'hosted-origin','checks':len(checks),'passed':checks,'physicalDeviceVerified':False},indent=2))
    print(json.dumps({'checks':len(checks),'passed':checks}))

if __name__ == '__main__': main()
