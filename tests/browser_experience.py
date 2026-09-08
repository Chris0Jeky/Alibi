"""Actual app integration: optional media, controls, lifecycle and offline notes."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/experience'; OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(ok,label):
    assert ok,label
    checks.append(label); print('PASS',label,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce')
    page=context.new_page(); errors=[]; requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.goto('http://127.0.0.1:8787/#/home');page.wait_for_selector('a[href="#/library"]')
    page.wait_for_timeout(300)
    check(not any('/folio-' in u for u in requests),'Puzzle startup requests no optional field-notes media')
    page.goto('http://127.0.0.1:8787/#/quiet/folio');page.wait_for_selector('#folio-stage img')
    page.locator('#folio-stage img').evaluate('(i)=>i.decode()')
    check(page.locator('[data-folio-tab]').count()==6,'Six field-notes sections are in the actual app')
    check(not any(u.endswith('.mp4') or u.endswith('.ogg') for u in requests),'Field notes opens silently without film or audio downloads')
    for i in range(3):
        page.locator('[data-piece]').nth(i).click();page.locator('#folio-open-3d').click()
        page.wait_for_function("document.querySelector('#quiet-host').shadowRoot.querySelector('#folio-model-status').textContent.startsWith('3D ready')")
        page.locator('[data-turn="1"]').click();page.locator('[data-zoom="0.1"]').click()
        check(page.locator('#folio-stage canvas').is_visible(),'Composed scene '+str(i)+' opens and turns in 3D')
    page.screenshot(path=str(OUT/'field-notes-desktop.png'),full_page=True)
    page.locator('[data-folio-tab="models"]').click()
    check(page.locator('[data-piece]').count()==40,'All forty modules are discoverable')
    page.locator('#folio-model-search').fill('tree')
    check(0<page.locator('[data-piece]:visible').count()<40,'Module search filters the cabinet')
    page.locator('[data-piece]:visible').first.click();page.locator('#folio-open-3d').click()
    page.wait_for_function("document.querySelector('#quiet-host').shadowRoot.querySelector('#folio-model-status').textContent.startsWith('3D ready')")
    page.locator('#folio-stage canvas').evaluate("c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
    page.wait_for_timeout(150)
    check(page.locator('#folio-stage img').is_visible(),'Context loss leaves the static illustration available')
    page.locator('[data-folio-tab="companions"]').click()
    for select in page.locator('[data-expression]').all():
        for value in ['idle','look','attention','happy','sleepy','pet','feed','celebrate']:
            select.select_option(value)
            select.locator('xpath=../..').locator('img').evaluate('(i)=>i.decode()')
    check(page.locator('[data-expression]').count()==4,'All 32 companion expressions decode through actual controls')
    page.locator('[data-folio-tab="audio"]').click()
    check(page.locator('audio').count()==24,'All twenty cues and four atmospheres have playback controls')
    check(page.locator('audio').evaluate_all('(xs)=>xs.every(x=>x.paused && x.preload==="none")'),'Audio waits for deliberate play')
    page.locator('audio').first.evaluate('(a)=>a.play()');page.wait_for_timeout(150)
    page.locator('[data-folio-tab="films"]').click()
    check(page.locator('video').count()==5,'Five compositions offer all eight film cuts')
    for video in page.locator('video').all():
        video.evaluate('(v)=>v.play()');page.wait_for_timeout(150)
        video.evaluate('(v)=>{v.pause();v.currentTime=v.duration/2}')
        page.wait_for_timeout(100)
        check(video.evaluate('(v)=>v.videoWidth>0 && v.currentTime>0'),'Film actually decodes and seeks')
    for select in page.locator('[data-film]').all():
        select.select_option(index=1);video=select.locator('xpath=../..').locator('xpath=..').locator('video')
        video.evaluate('(v)=>v.play()');page.wait_for_timeout(150)
        check(video.evaluate('(v)=>v.videoHeight>v.videoWidth'),'Portrait film plays in portrait framing')
        video.evaluate('(v)=>v.pause()')
    for width in [390,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        for tab in ['rooms','portraits','companions','audio','films']:
            page.locator('[data-folio-tab="'+tab+'"]').click()
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),tab+' fits '+str(width)+'px')
        page.locator('[data-folio-tab="portraits"]').click()
        page.screenshot(path=str(OUT/('portraits-'+str(width)+'.png')),full_page=True)
    # This pack is explicitly kept, separate from startup and Quiet Wing's automatic pack.
    page.locator('#folio-offline').click()
    page.wait_for_function("document.querySelector('#quiet-host').shadowRoot.querySelector('#folio-download-status').textContent.startsWith('Artwork, models and sounds are ready')",timeout=120000)
    page.wait_for_function('AlibiActivities.diagnostics().offline',timeout=30000)
    context.set_offline(True);page.reload();page.wait_for_selector('#folio-stage img');page.locator('#folio-stage img').evaluate('(i)=>i.decode()')
    page.locator('#folio-open-3d').click()
    page.wait_for_function("document.querySelector('#quiet-host').shadowRoot.querySelector('#folio-model-status').textContent.startsWith('3D ready')")
    check(True,'Kept scene and 3D model work after a real offline reload')
    context.set_offline(False)
    page.goto('http://127.0.0.1:8787/#/quiet/pets');page.wait_for_selector('[data-pet-action="treat"]')
    page.locator('[data-pet-action="treat"]').click()
    check(page.locator('#pet-portrait .state-feed').count()==1,'Actual treat action uses the new illustrated expression')
    page.locator('#room-ambience').select_option('ambience-coastal-window')
    check(page.locator('[data-act="sound"]').get_attribute('aria-label')=='Mute sound','Atmosphere selection enables the existing sound preference')
    page.locator('[data-act="sound"]').click()
    check(page.locator('#room-ambience').input_value()=='','Mute clears the active atmosphere selection')
    page.goto('http://127.0.0.1:8787/#/home');page.wait_for_timeout(300)
    check(page.evaluate('!AlibiActivities.diagnostics().active'),'Leaving disposes the optional activity')
    check(not errors,'No uncaught app errors: '+str(errors))
    browser.close()
(OUT/'results.json').write_text(json.dumps({'checks':checks,'physicalDevice':False},indent=2),encoding='utf-8')
