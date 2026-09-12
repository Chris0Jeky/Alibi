"""Phone UI contract. Source harness is explicitly distinct from hosted-release evidence."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_RESULTS', ROOT / 'test-results/house-mobile'))
SOURCE = os.environ.get('ALIBI_HOUSE_SOURCE')
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
OUT.mkdir(parents=True, exist_ok=True)
checks, errors = [], []

def check(value, name):
    assert value, name
    checks.append(name)
    print('PASS', name, flush=True)

def go(page, view):
    selector = '.hx-mobile' if page.viewport_size['width'] <= 760 else '.hx-nav'
    names = {'desk':'Your desk','house':'The house','notebook':'Notebook','comfort':'Comfort','puzzles':'Puzzles'}
    page.locator(selector).get_by_role('link', name=names[view], exact=True).click()
    page.wait_for_timeout(100)

def fit(page, name):
    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), name+' fits viewport')
    check(page.evaluate('''() => {const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return a.length===new Set(a).size}'''),name+' unique IDs')

def main():
    with sync_playwright() as pw:
        options = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        elif Path('/usr/bin/chromium').exists():
            options['executable_path'] = '/usr/bin/chromium'
        browser = pw.chromium.launch(**options)
        for width in (320,360,390,430,768,1440):
            ctx = browser.new_context(viewport={'width':width,'height':844}, is_mobile=width<=430,has_touch=width<=430,reduced_motion='reduce')
            page = ctx.new_page()
            page.set_default_timeout(7000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            if SOURCE: page.set_content(Path(SOURCE).read_text(),wait_until='load')
            else: page.goto(URL+'/#/home?ux=house')
            page.locator('.hx-experience').wait_for()
            check(page.locator('[data-house-action=play]').count()==1,f'{width} single desk play action')
            if width<=430:
                check(page.locator('.hx-resume [data-house-action=play]').bounding_box()['y']<550,f'{width} play without a long scroll')
                check(page.evaluate('''() => [...document.querySelectorAll('.hx-mobile a')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=48})'''),f'{width} dock targets >=44x48')
            for view in ('desk','puzzles','house','notebook','comfort'):
                go(page,view)
                fit(page,f'{width} {view}')
                check(page.evaluate('''() => [...document.querySelectorAll('.hx-content button')].every(e=>!!(e.textContent.trim()||e.getAttribute('aria-label')))'''),f'{width} {view} named buttons')
                if width==390:
                    page.screenshot(path=str(OUT/f'{view}-390.png'))
                if width==1440 and view=='desk': page.screenshot(path=str(OUT/'desk-1440.png'))
            go(page,'puzzles')
            original = page.evaluate('location.hash')
            page.locator('#hx-filters-open').click()
            expect(page.locator('#dialog')).to_be_visible()
            check(page.evaluate("document.activeElement.name")=='family',f'{width} sheet initial focus')
            page.locator('#hx-filter-form [name=family]').select_option('nonogram')
            page.keyboard.press('Escape')
            page.wait_for_timeout(120)
            check(page.evaluate('location.hash')==original,f'{width} cancel discards draft filters')
            check(page.evaluate('document.activeElement.id')=='hx-filters-open',f'{width} cancel restores filter opener')
            page.locator('#hx-filters-open').click()
            page.locator('#hx-filter-form [name=family]').select_option('binary')
            page.locator('#hx-filter-form [name=level]').select_option('Gentle')
            if width==390: page.screenshot(path=str(OUT/'filters-390.png'))
            page.locator('#hx-filter-form').get_by_role('button',name='Apply filters').click()
            page.wait_for_timeout(150)
            check('family=binary' in page.evaluate('location.hash') and 'level=Gentle' in page.evaluate('location.hash'),f'{width} explicit apply updates route')
            expect(page.locator('#dialog')).not_to_be_visible()
            check(page.evaluate('document.activeElement.id')=='hx-filters-open',f'{width} apply restores filter focus')
            check(page.locator('.hx-puzzle').count()>0,f'{width} combined filters return puzzles')
            page.locator('#hx-filters-open').click()
            page.locator('[data-house-action=filter-reset]').click()
            page.locator('#hx-filter-form').get_by_role('button',name='Apply filters').click()
            page.wait_for_timeout(120)
            check('family=' not in page.evaluate('location.hash'),f'{width} reset then apply')
            page.locator('.hx-chip').filter(has_text='Gentle').click()
            expect(page.locator('.hx-chip').filter(has_text='Gentle')).to_have_attribute('aria-current','true')
            check('level=Gentle' in page.evaluate('location.hash'),f'{width} quick chip applies')
            page.locator('.hx-chip').filter(has_text='Gentle').click()
            expect(page.locator('.hx-chip').filter(has_text='Gentle')).not_to_have_attribute('aria-current','true')
            check('level=Gentle' not in page.evaluate('location.hash'),f'{width} quick chip toggles off')
            page.locator('#hx-query').fill('zz-no-match')
            page.locator('#hx-query').press('Enter')
            expect(page.locator('.hx-empty')).to_be_visible()
            page.locator('.hx-empty a').click()
            if width<=430:
                page.locator('.hx-puzzle button').nth(5).focus()
                page.wait_for_timeout(120)
                check(page.evaluate('''() => document.activeElement.getBoundingClientRect().bottom <= document.querySelector('.hx-mobile').getBoundingClientRect().top'''),f'{width} focused puzzle clear of dock')
            go(page,'house')
            page.locator('.hx-room-cards [data-room=library]').click()
            if width==390: page.screenshot(path=str(OUT/'observation-390.png'))
            page.keyboard.press('Escape')
            page.wait_for_timeout(100)
            expect(page.locator('.hx-room-cards [data-room=library]')).to_contain_text('Observed')
            check(page.locator('.hx-room-cards [data-room=library]').get_attribute('aria-label').endswith('observed'),f'{width} observation status not colour-only')
            go(page,'desk')
            # Dispatch a real resource failure to the real handler; no application API stub.
            if page.locator('[data-house-art]').count():
                page.locator('[data-house-art]').evaluate("e=>{e.src='data:image/png;base64,broken';}")
                page.wait_for_timeout(150)
                expect(page.locator('[data-house-art]')).to_have_class('hx-art-unavailable')
                expect(page.locator('.hx-hero [data-house-action=letter]')).to_be_visible()
                check(True,f'{width} failed artwork retains text and envelope control')
            go(page,'comfort')
            page.locator('#hx-setting-largeText').check()
            page.locator('#hx-setting-contrast').check()
            page.locator('#theme-select').select_option('night')
            for view in ('desk','puzzles','house','notebook','comfort'):
                go(page,view);fit(page,f'{width} large/night/contrast {view}')
            page.emulate_media(forced_colors='active')
            fit(page,f'{width} forced colours')
            page.emulate_media(forced_colors='none')
            if width==390:
                go(page,'desk');page.screenshot(path=str(OUT/'night-390.png'))
                page.set_viewport_size({'width':640,'height':360})
                check(page.locator('.hx-mobile').evaluate("e=>getComputedStyle(e).position")=='static','short landscape puts navigation in flow')
                fit(page,'short landscape')
            ctx.close()
        check(not errors,'no JavaScript page errors')
        browser.close()
    receipt={'mode':'source-set-content-no-origin' if SOURCE else 'hosted-build','checks':len(checks),'passed':checks,'errors':errors,'physicalDeviceVerified':False,'durabilityAndOfflineVerified':False}
    (OUT/'results.json').write_text(json.dumps(receipt,indent=2))
    print(json.dumps({'mode':receipt['mode'],'checks':len(checks)}))

if __name__=='__main__': main()
