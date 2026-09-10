"""Local and hosted visual refresh: real image decode, original navigation, lazy activity entry."""
from pathlib import Path
import json,os,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/atmosphere';OUT.mkdir(parents=True,exist_ok=True)
BOOK_IDS=sorted(book['id'] for book in json.loads((ROOT/'content/casebooks.json').read_text(encoding='utf-8')))
checks=[];errors=[];requests=[]
def check(v,label):
    assert v,label
    checks.append(label);print('PASS',label,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True)
    ctx=browser.new_context(viewport={'width':1440,'height':1000})
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
    base=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')
    page.goto(base+'#/home');page.wait_for_selector('.quiet-invitation')
    page.wait_for_function('()=>navigator.serviceWorker.controller && window.AlibiDiagnostics?.getStatus().offlineReady')
    check(page.locator('.quiet-destinations a').count()==4,'Club invites players to all four Quiet Wing areas')
    check(page.evaluate('!window.QWEngine'),'Art on the Club page does not execute the optional game engines')
    check(not any('/assets/quiet-activity.' in url for url in requests),'Opening the Club does not request the optional activity bundle')
    for width in [390,768,1440]:
        page.set_viewport_size({'width':width,'height':950})
        for route in ['home','library/bridges','library/nonogram','library/scene','casebooks','quiet/garden']:
            # A fresh document prevents a shared figure selector matching the departing route.
            page.goto(base+'#/'+route)
            page.reload()
            page.wait_for_function('()=>navigator.serviceWorker.controller && window.AlibiDiagnostics?.getStatus().offlineReady')
            if route=='quiet/garden': page.wait_for_selector('.garden-inspiration')
            elif route=='home':page.wait_for_selector('.quiet-invitation')
            else:page.wait_for_selector('.collection-atmosphere')
            # Wait until the current location's images can really decode, including lazy images.
            target=page.locator('.garden-inspiration' if route=='quiet/garden' else '.quiet-invitation' if route=='home' else '.collection-atmosphere')
            # A tall figure may scroll its caption into view while its lazy image remains offscreen.
            # Inspect the current route's image, rather than unrelated/hidden figures in the document.
            picture=target.locator('img').first
            picture.scroll_into_view_if_needed()
            try:
                picture.evaluate('async img => { await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error("Museum image decode exceeded 10 seconds")),10000))]); if(!img.naturalWidth) throw Error("Empty museum image"); }')
            except Exception:
                (OUT/'image-failure.json').write_text(json.dumps({'route':route,'width':width,'images':target.locator('img').evaluate_all('(imgs)=>imgs.map(i=>({src:i.currentSrc||i.src,complete:i.complete,width:i.naturalWidth,loading:i.loading,rect:i.getBoundingClientRect().toJSON()}))'),'errors':errors},indent=2))
                raise
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)+' '+route+' fits the viewport')
            check('Public Domain' in target.inner_text(),str(width)+' '+route+' displays the real artwork credit')
            target.screenshot(path=str(OUT/(route.replace('/','-')+'-'+str(width)+'.png')))
    page.evaluate('location.hash="/casebooks"');page.wait_for_selector('.full-books')
    rendered_books=page.locator('.full-books .book-card').evaluate_all('(cards)=>cards.map(card=>card.dataset.id).sort()')
    check(rendered_books==BOOK_IDS,'Every registered casebook remains available without duplicates')
    page.evaluate('location.hash="/home"');page.wait_for_selector('.quiet-destinations')
    page.locator('.quiet-destinations a[href="#/quiet/classics"]').click();page.wait_for_selector('[data-play="tideglass-morning"]')
    check(page.locator('[data-play="pairs-meadow"]').is_visible(),'Source invitation opens the new game shelf')
    check(not any('metmuseum.org' in url or 'artic.edu' in url for url in requests),'Playing never fetches museum servers')
    check(not errors,'No uncaught errors across original and new navigation')
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'base':base,'scope':'Browser viewports and actual decoded images; physical devices are separate'},indent=2))
    browser.close()
