"""Asset integration and production-gallery controls. Uses disposable browser profiles."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/').rstrip('/')+'/'
OUT=ROOT/'test-results/assets/acceptance';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(value,label):
    assert value,label
    checks.append(label);print('PASS',label,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL+'#/library')
    page.locator('[data-action="browse-all"]').click()
    page.wait_for_selector('.puzzle-card')
    page.wait_for_function('()=>navigator.serviceWorker.controller && window.AlibiDiagnostics?.getStatus().offlineReady')
    while page.locator('[data-action="show-more"]').count():
        page.locator('[data-action="show-more"]').click()
    check(page.locator('svg.puzzle-art').count()==page.locator('.puzzle-card').count(),'Every puzzle card leads with a family diagram')
    check(page.locator('.collection-stamp').count()==208,'Reviewed collection stamps remain secondary metadata')
    check(page.locator('.puzzle-highlight').count()==0,'Repeated cover images no longer replace family diagrams')
    for art in page.locator('svg.puzzle-art').all():
        check(art.get_attribute('aria-hidden')=='true','Family diagram is decorative alongside the readable category')
    for theme in ['light','night']:
        page.goto(URL+'#/settings');page.wait_for_selector('#theme-select')
        page.locator('#theme-select').select_option(theme)
        page.goto(URL+'#/library/scene');page.wait_for_selector('svg.puzzle-art')
        first=page.locator('.puzzle-card').first
        first.scroll_into_view_if_needed();page.keyboard.press('Tab');first.locator('.card-open').focus()
        first.screenshot(path=str(OUT/('highlight-focus-'+theme+'.png')))
        check(page.evaluate('document.documentElement.dataset.theme')==theme,'Actual '+theme+' theme applies to illustrated cards')
    for width in [390,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        for route in ['library/scene','library/witness','club','quiet/journal']:
            page.goto(URL+'#/'+route);page.wait_for_timeout(500)
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)+' '+route+' fits')
            page.screenshot(path=str(OUT/(route.replace('/','-')+'-'+str(width)+'.png')))
    page.goto(URL+'#/club');page.wait_for_selector('.club-stamp')
    check(page.locator('.club-stamp').count()==6,'Six real Club awards preserved')
    check(page.locator('.club-stamp.earned').count()==0,'Empty profile fabricates no Club achievements')
    page.goto(URL+'#/quiet/journal');page.wait_for_selector('.badge svg')
    check(page.locator('.badge svg').count()==25,'All 25 Quiet Wing stamps use one accessible decorative SVG')
    page.goto('http://127.0.0.1:8790/');page.wait_for_selector('.asset')
    check(page.locator('.asset').count()>80,'Gallery renders actual produced catalogue')
    check(page.locator('audio[autoplay],video[autoplay]').count()==0,'Gallery never autoplays media')
    check(page.locator('.asset').filter(has_text='existing-evidence').count()==0,'Solved evidence hidden by default')
    page.locator('#spoilers').check()
    check(page.locator('.asset').filter(has_text='existing-evidence').count()==1,'Solved evidence requires explicit reveal')
    page.locator('#spoilers').uncheck();page.locator('#search').fill('highlight-')
    check(page.locator('.asset').count()==12,'Search finds twelve real highlights')
    for width in [390,1440]:
        page.set_viewport_size({'width':width,'height':1000});page.locator('#theme').click()
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Gallery responsive '+str(width))
        page.screenshot(path=str(OUT/('gallery-'+str(width)+'.png')),full_page=True)
    page.locator('#search').fill('');page.get_by_role('button',name='badges',exact=True).click()
    check(page.locator('.asset').count()==31,'Gallery contains 31 distinct earned/locked badge designs')
    page.locator('#size').select_option('small');page.screenshot(path=str(OUT/'badge-small.png'),full_page=True)
    page.get_by_role('button',name='families',exact=True).click()
    check(page.locator('.asset').count()==13,'All thirteen existing category treatments retained')
    check(not errors,'No page errors during app or gallery navigation')
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local Chromium; no physical-device certification'},indent=2),encoding='utf8')
    browser.close()


