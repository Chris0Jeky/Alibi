"""Actual-control checks for Castle deep links and Quiet Wing field notes."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8797/').rstrip('/') + '/'
OUT = Path(os.environ.get('ALIBI_RESULTS', 'test-results')) / 'castle-quiet-polish'
OUT.mkdir(parents=True, exist_ok=True)
failures = []

def check(condition, label):
    print(('PASS ' if condition else 'FAIL ') + label, flush=True)
    if not condition:
        failures.append(label)

with sync_playwright() as p:
    args = {'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('CHROMIUM_PATH'):
        args['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = p.chromium.launch(**args)
    for width in (320, 1280):
        context = browser.new_context(viewport={'width': width, 'height': 900})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '#/quiet/gallery', wait_until='domcontentloaded')
        page.locator('.artcard').first.wait_for(timeout=30000)
        for title, credit in [('Self-Portrait', 'Joseph Winterbotham Collection'), ('The Bedroom', 'Helen Birch Bartlett Memorial Collection'), ('A Sunday on La Grande Jatte — 1884', 'Helen Birch Bartlett Memorial Collection')]:
            card = page.locator('.artcard').filter(has=page.get_by_role('heading', name=title, exact=True))
            text = card.locator('.art-credit').inner_text()
            check('Public Domain' in text and credit in text and 'Verify' not in text, f'{width}: {title} rights and credit')
        page.goto(BASE + '#/quiet/folio', wait_until='domcontentloaded')
        page.locator('[data-folio-tab="models"]').click(timeout=30000)
        search = page.locator('#folio-model-search')
        search.fill('zzzznothingmatches')
        check(page.locator('[data-piece]:visible').count() == 0, f'{width}: absent query hides pieces')
        notice = page.locator('#folio-search-status')
        check(notice.count() == 1 and notice.is_visible() and 'no pieces' in notice.inner_text().lower(), f'{width}: no-result message is visible')
        check(notice.count() == 1 and notice.get_attribute('role') == 'status', f'{width}: no-result message exposes live status')
        search.fill('tree')
        check(page.locator('[data-piece]:visible').count() > 0, f'{width}: matching query shows pieces')
        check(notice.count() == 1 and not notice.is_visible(), f'{width}: matching query clears message')
        check(search.evaluate('(e) => e === e.getRootNode().activeElement'), f'{width}: filtering retains focus')
        page.goto(BASE + '#/quiet/castle/room/observatory', wait_until='domcontentloaded')
        page.locator('#castle-main').wait_for(timeout=30000)
        dialog = page.locator('#castle-dialog')
        check(not dialog.is_visible(), f'{width}: first-visit letter does not cover the locked notice')
        main = page.locator('#castle-main')
        route_notice = page.locator('#castle-route-notice')
        check(route_notice.count() == 1 and 'Recover the maintenance slip in the Long Library' in route_notice.inner_text(), f'{width}: locked deep link explains unlock')
        check(route_notice.count() == 1 and route_notice.get_attribute('role') == 'status', f'{width}: locked notice exposes status')
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{width}: page fits viewport')
        page.screenshot(path=str(OUT / f'locked-{width}.png'), full_page=True)
        page.evaluate('location.hash = "#/quiet/castle/room/library"')
        page.locator('#castle-main h1').filter(has_text='The Long Library').wait_for(timeout=30000)
        check(route_notice.count() == 0, f'{width}: opening available room clears old notice')
        check(not errors, f'{width}: no uncaught browser errors {errors}')
        context.close()
    browser.close()
if failures:
    raise AssertionError('; '.join(failures))
print('Castle and Quiet Wing polish checks passed')
