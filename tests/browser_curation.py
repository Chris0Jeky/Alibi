"""Real-origin curation controls and artwork; no physical-device certification."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/curation-ui';OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/').rstrip('/')+'/'
checks=[]
def check(value,text):
    assert value,text
    checks.append(text)
def dismiss(page):
    if page.locator('dialog[open] [data-action="lesson-finish"]').count():page.locator('dialog[open] [data-action="lesson-finish"]').click()
    elif page.locator('dialog[open] [data-action="close-dialog"]').count():page.locator('dialog[open] [data-action="close-dialog"]').first.click()
def route(page,value):
    dismiss(page);page.evaluate('(v)=>location.hash=v',value)
    page.wait_for_timeout(120)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width in (360,1280):
        context=browser.new_context(viewport={'width':width,'height':950},accept_downloads=True,reduced_motion='reduce')
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL+'#/library');page.wait_for_function('()=>window.AlibiDiagnostics')
        page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==328,'328 official puzzles load')
        page.locator('[data-action="browse-all"]').click()
        page.locator('.curation-collections > summary').click()
        for venue in ('salt','copper','winter','nocturne'):
            page.locator(f'[data-action="curation-venue"][data-value="{venue}"]').click()
            cards=page.locator('.puzzle-card')
            check(cards.count()==24,'Anthology renders first 24 bounded cards '+venue)
            check(all('provisional' in t for t in cards.locator('.difficulty').all_inner_texts()),'New difficulty is provisional '+venue)
            check(all('min' not in t for t in cards.locator('.card-meta').all_inner_texts()),'Unmeasured cards have no time estimate '+venue)
            check(page.evaluate("[...document.querySelectorAll('.puzzle-highlight')].every(i=>!i.src.includes('solution'))"),'No answer art in thumbnails')
            if page.locator('.curation-gallery').get_attribute('open') is None:
                page.locator('.curation-gallery > summary').click()
            page.locator('.curation-gallery img').first.scroll_into_view_if_needed()
            page.wait_for_function("()=>[...document.querySelectorAll('.curation-gallery img')].every(i=>i.complete&&i.naturalWidth>0)")
            check(page.locator('.curation-gallery a').count()>=1,'Museum image has an object credit '+venue)
            check(not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'No library overflow '+str(width))
            page.locator('.curation-collections > summary').focus();page.evaluate('document.activeElement.blur()')
            page.screenshot(path=str(OUT/f'{width}-{venue}.png'),full_page=True)
        route(page,'#/play/curated-network-01@1');page.wait_for_function("()=>AlibiDiagnostics.getCurrent()?.puzzle.id==='curated-network-01'");dismiss(page)
        page.locator('[data-action="curation-notes"]').click()
        check(page.locator('[data-curation-notes]').count()==1,'Trusted notes open through controls')
        check(page.locator('[data-curation-answer]').count()==0,'Unsolved notes do not reveal answers')
        dismiss(page);page.locator('[data-action="hint"]').first.click()
        check('Revisit a conflict' not in page.locator('dialog[open]').inner_text(),'Scrambled network hint avoids conflict framing')
        dismiss(page)
        route(page,'#/play/curated-sudoku-02@1');page.wait_for_function("()=>AlibiDiagnostics.getCurrent()?.puzzle.id==='curated-sudoku-02'");dismiss(page)
        puzzle=page.evaluate('AlibiDiagnostics.getCurrent().puzzle');i=next(i for i,v in enumerate(puzzle['givens']) if not v)
        page.locator(f'[data-action="cell"][data-cell="{i}"]').click();page.locator(f'[data-action="value"][data-value="{puzzle["solution"][i]}"]').click()
        page.wait_for_function("()=>document.querySelector('#save-state')?.textContent.includes('Saved on this device')")
        before=page.evaluate('AlibiDiagnostics.getCurrent().state')
        page.locator('[data-action="undo"]').first.click();check(page.evaluate('AlibiDiagnostics.getCurrent().state')!=before,'New puzzle undo changes state')
        page.locator('[data-action="redo"]').first.click();check(page.evaluate('AlibiDiagnostics.getCurrent().state')==before,'New puzzle redo restores state')
        page.wait_for_function("()=>document.querySelector('#save-state')?.textContent.includes('Saved on this device')")
        page.wait_for_function("()=>navigator.serviceWorker.controller!==null")
        context.set_offline(True);page.reload();page.wait_for_function('()=>window.AlibiDiagnostics');dismiss(page)
        check(page.evaluate('AlibiDiagnostics.getCurrent().state')==before,'New official run survives offline reload')
        page.locator('[data-action="curation-notes"]').click();check(page.locator('[data-curation-notes]').count()==1,'Curator notes remain available offline');dismiss(page)
        check(not errors,'No uncaught curation errors')
        context.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps({'passed':True,'checks':checks},indent=2))
print('PASS',len(checks),'curation browser checks')
