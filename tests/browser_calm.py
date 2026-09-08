"""Complete new relaxing games through real controls and replay their saved actions."""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/quiet-wing';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(v,label):
    assert v,label
    checks.append(label);print('PASS',label,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True)
    ctx=browser.new_context(viewport={'width':1280,'height':950})
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    base=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')
    page.goto(base+'#/quiet/classics');page.wait_for_function('()=>window.QWApp?.route==="classics"')
    original=page.evaluate('JSON.stringify(QWApp.state.pets)')
    for game in ['tideglass-morning','tideglass-dusk','pairs-meadow','pairs-shore']:
        page.locator('[data-play="'+game+'"]').click()
        page.wait_for_function('(id)=>QWApp.classic===id',arg=game)
        check(page.locator('#classic-board').is_visible(),game+' opens from the activity shelf')
        if game.startswith('tideglass'):
            page.locator('#classic-hint').click()
            check('glass' in page.locator('#modal').inner_text(),game+' has a current-board pouring hint')
            page.locator('[data-close]').click()
            actions=page.evaluate('QWCalm.solve(QWApp.state.classics[QWApp.classic].state).actions')
            # An incompatible pour must leave replay history untouched.
            page.locator('[data-glass="0"]').click();page.locator('[data-glass="1"]').click()
            check(page.evaluate('QWApp.state.classics[QWApp.classic].actions.length')==0,game+' refuses an illegal pour without changing progress')
            page.locator('[data-glass="0"]').click() # cancel the still-selected source
            for i,action in enumerate(actions):
                page.locator('[data-glass="'+str(action['from'])+'"]').click();page.locator('[data-glass="'+str(action['to'])+'"]').click()
                if i==0:
                    page.locator('#classic-undo').click()
                    check(page.evaluate('QWApp.state.classics[QWApp.classic].actions.length')==0,game+' undoes one whole pour')
                    page.locator('[data-glass="'+str(action['from'])+'"]').click();page.locator('[data-glass="'+str(action['to'])+'"]').click()
        else:
            cards=page.evaluate('QWApp.state.classics[QWApp.classic].state.cards')
            check(page.locator('[data-calm-cell][aria-label$="face down"]').count()==16,game+' hides all unseen pictures from visible and accessible labels')
            page.locator('[data-calm-cell="0"]').click()
            page.wait_for_function('()=>!QWApp.dirty')
            page.reload();page.wait_for_function('(id)=>window.QWApp?.classic===id&&QWApp.state?.classics[id]',arg=game)
            check(page.evaluate('QWApp.state.classics[QWApp.classic].state.open')==[0],game+' resumes the first reveal after reload')
            page.locator('#classic-undo').click()
            for value in range(8):
                for cell in [i for i,v in enumerate(cards) if v==value]: page.locator('[data-calm-cell="'+str(cell)+'"]').click()
        check(page.locator('#classic-result').inner_text().find('You found a way')>=0,game+' completes through actual controls')
        check(page.evaluate('(id)=>QWApp.state.stats.solves.includes(id)',game),game+' records its own completion')
        page.screenshot(path=str(OUT/(game+'-desktop.png')),full_page=True)
        page.set_viewport_size({'width':390,'height':850});page.screenshot(path=str(OUT/(game+'-mobile.png')),full_page=True)
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),game+' fits a narrow phone viewport')
        page.set_viewport_size({'width':1280,'height':950})
        page.locator('#classic-back').click();page.wait_for_selector('[data-play="'+game+'"]')
    check(page.evaluate('JSON.stringify(QWApp.state.pets)')==original,'New games leave companion state unchanged')
    page.wait_for_function('()=>!QWApp.dirty')
    page.wait_for_function('()=>AlibiActivities.diagnostics().offline');ctx.set_offline(True)
    page.reload();page.wait_for_function('()=>window.QWApp?.state')
    check(page.evaluate('QWApp.state.stats.solves.length')==4,'All four new completions survive offline reload')
    check(not errors,'No uncaught errors in new game controls')
    (OUT/'calm-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local Chromium actual controls; phone dimensions simulated'},indent=2))
    browser.close()
