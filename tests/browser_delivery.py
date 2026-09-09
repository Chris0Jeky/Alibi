"""Real-origin adaptive artwork, failure recovery, data preference and offline play."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'delivery'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').rstrip('/') + '/'
checks = []
def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)
def gallery(page):
    page.goto(URL + '#/library')
    page.reload()
    page.wait_for_function('()=>window.AlibiDiagnostics && navigator.serviceWorker.controller')
    if page.locator('.curation-collections').get_attribute('open') is None:
        page.locator('.curation-collections > summary').click()
    page.locator('[data-action="curation-venue"][data-value="nocturne"]').click()
    page.locator('.curation-gallery > summary').click()
    image = page.locator('img[data-adaptive-image]').first
    image.scroll_into_view_if_needed()
    page.wait_for_function('()=>document.querySelector("img[data-adaptive-image]")?.naturalWidth > 0')
    return image
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in (390, 1280):
        context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
        page = context.new_page()
        image = gallery(page)
        page.wait_for_function('()=>document.querySelector("img[data-adaptive-image]")?.dataset.assetQuality === "enhanced"')
        check(image.evaluate('(i)=>i.naturalHeight') == 1600, 'Online gallery decodes 1600px artwork ' + str(width))
        page.wait_for_function('async()=> (await (await caches.open("alibi-enhanced-images-v1")).keys()).length>0')
        check(not page.evaluate('document.documentElement.scrollWidth > innerWidth+1'), 'Gallery controls fit viewport ' + str(width))
        page.screenshot(path=str(OUT / f'online-{width}.png'), full_page=True)
        page.locator('[data-asset-mode]').click()
        page.wait_for_function('()=>document.querySelector("img[data-adaptive-image]").dataset.assetQuality === "compact"')
        check(page.locator('[data-asset-mode]').get_attribute('aria-pressed') == 'true', 'Compact preference control is pressed')
        context.set_offline(True)
        image = gallery(page)
        check(image.get_attribute('data-asset-quality') == 'compact', 'Preference survives offline reload')
        check(image.evaluate('(i)=>Math.max(i.naturalHeight,i.naturalWidth)') == 600, 'Offline fallback is the actual 600px museum work')
        page.locator('[data-asset-mode]').click()
        page.wait_for_function('()=>document.querySelector("img[data-adaptive-image]").dataset.assetQuality === "enhanced"')
        check(image.evaluate('(i)=>i.naturalHeight') == 1600, 'Cached sharper detail is usable offline')
        page.screenshot(path=str(OUT / f'offline-{width}.png'), full_page=True)
        context.close()
    # No enhanced cache: install the core, then go offline before the gallery is ever opened.
    context = browser.new_context(viewport={'width':390,'height':900})
    page = context.new_page(); page.goto(URL)
    page.wait_for_function('()=>window.AlibiDiagnostics && navigator.serviceWorker.controller')
    context.set_offline(True)
    image = gallery(page)
    check(image.evaluate('(i)=>Math.max(i.naturalHeight,i.naturalWidth)') == 600, 'Never-visited gallery works from the core offline installation')
    page.goto(URL + '#/play/curated-sudoku-02@1')
    page.wait_for_function('()=>AlibiDiagnostics.getCurrent()?.puzzle.id === "curated-sudoku-02"')
    if page.locator('dialog[open] [data-action="lesson-finish"]').count(): page.locator('[data-action="lesson-finish"]').click()
    elif page.locator('dialog[open] [data-action="close-dialog"]').count(): page.locator('dialog[open] [data-action="close-dialog"]').click()
    puzzle = page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
    i = next(i for i,v in enumerate(puzzle['givens']) if not v)
    page.locator(f'[data-action="cell"][data-cell="{i}"]').click()
    page.locator(f'[data-action="value"][data-value="{puzzle["solution"][i]}"]').click()
    page.wait_for_function('()=>document.querySelector("#save-state").textContent.includes("Saved on this device")')
    state = page.evaluate('AlibiDiagnostics.getCurrent().state')
    page.reload(); page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()')
    check(page.evaluate('AlibiDiagnostics.getCurrent().state') == state, 'Actual offline move persists through reload without enhanced assets')
    context.close()
    # HTTP failures must leave the complete image; an online event retries after recovery.
    context = browser.new_context(viewport={'width':390,'height':900})
    context.route('**/assets/enhanced-*', lambda route: route.fulfill(status=503, body='Unavailable'))
    page = context.new_page(); image = gallery(page)
    page.wait_for_timeout(500)
    check(image.get_attribute('data-asset-quality') == 'compact' and image.evaluate('(i)=>i.naturalWidth>0'), '503 retains useful compact artwork')
    context.unroute('**/assets/enhanced-*')
    page.evaluate('dispatchEvent(new Event("online"))')
    page.wait_for_function('()=>document.querySelector("img[data-adaptive-image]").dataset.assetQuality === "enhanced"')
    check(True, 'Connectivity recovery upgrades the same view')
    context.close(); browser.close()
(OUT / 'results.json').write_text(json.dumps({'passed':True,'checks':checks}, indent=2))
print('PASS', len(checks), 'adaptive delivery browser checks')
