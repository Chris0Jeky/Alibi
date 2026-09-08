"""Actual companion controls, licensed-model animation, fallback and offline persistence."""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/quiet-wing';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];details={}
def check(value,label):
    assert value,label
    checks.append(label);print('PASS',label,flush=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--enable-unsafe-swiftshader'])
    ctx=browser.new_context(viewport={'width':1280,'height':950})
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    base=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')
    page.goto(base+'#/quiet/pets')
    page.wait_for_function('()=>window.QWApp?.petView?.mode === "webgl"',timeout=30000)
    page.wait_for_function('()=>AlibiActivities.diagnostics().offline')
    for species in ['cat','fox','owl','dragon']:
        page.locator('[data-species="'+species+'"]').click()
        page.wait_for_function('(s)=>QWApp.petView.species===s && QWApp.petView.mode==="webgl"',arg=species)
        details[species]=page.evaluate('({clips: Object.keys(QWApp.petView.clips||{}), triangles:QWApp.petView.gpu.info.render.triangles})')
        check(details[species]['triangles']>100,species+' displays actual 3D geometry')
        page.locator('#rename-pet').click();page.locator('#pet-name').fill('Friend '+species);page.locator('#save-name').click()
        page.wait_for_function('()=>QWApp.petView?.mode==="webgl"')
        before=page.evaluate('(s)=>QWApp.state.pets.bond[s]',species)
        page.locator('[data-pet-action="play"]').click()
        check(page.evaluate('QWApp.petView.action')=='play',species+' play control reaches animated portrait')
        check(page.evaluate('(s)=>QWApp.state.pets.bond[s]',species)==before+1,species+' retains existing affection reducer')
        page.wait_for_function('()=>QWApp.petView.elapsed>.1')
        check(page.evaluate('QWApp.petView.actor.position.y')>0,species+' play animation advances')
        for action in ['pet','treat','groom','nap']:
            page.locator('[data-pet-action="'+action+'"]').click()
            check(page.evaluate('QWApp.petView.action')==action,species+' '+action+' has an explicit presentation')
        check(page.evaluate('QWApp.petView.frame')==0,species+' nap stops animation')
        page.locator('[data-pet-action="pet"]').click()
        page.screenshot(path=str(OUT/('companion-'+species+'.png')),full_page=True)
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function('()=>QWApp.petView.frame===0')
        check(page.evaluate('QWApp.petView.frame')==0,species+' responds to live reduced-motion changes')
        page.emulate_media(reduced_motion='no-preference')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    check(page.evaluate('QWApp.petView.frame')==0,'Simulated hidden page stops companion frames')
    page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    page.evaluate('window.oldPetView=QWApp.petView;location.hash="/quiet/garden"')
    page.wait_for_function('()=>QWApp.route==="garden"')
    check(page.evaluate('oldPetView.disposed && oldPetView.frame===0 && oldPetView.world===null'),'Navigation disposes the companion scene and animation')
    page.evaluate('location.hash="/quiet/pets"');page.wait_for_function('()=>QWApp.petView?.mode==="webgl"')
    page.evaluate("QWApp.petView.gpu.getContext().getExtension('WEBGL_lose_context').loseContext()")
    page.wait_for_function('()=>QWApp.petView.mode==="illustration"')
    page.locator('[data-pet-action="treat"]').click()
    check(page.locator('#pet-portrait .action-treat').is_visible(),'Actual WebGL loss retains usable illustrated actions')
    page.wait_for_function('()=>!QWApp.dirty')
    ctx.set_offline(True);page.reload();page.wait_for_function('()=>window.QWApp?.petView?.mode==="webgl"')
    for species in ['cat','fox','owl','dragon']:
        page.locator('[data-species="'+species+'"]').click()
        page.wait_for_function('(s)=>QWApp.petView.species===s && QWApp.petView.mode==="webgl"',arg=species)
        check(page.evaluate('(s)=>QWApp.state.pets.names[s]',species)=='Friend '+species,species+' name and 3D model survive an offline reload')
    page.set_viewport_size({'width':390,'height':850})
    page.screenshot(path=str(OUT/'companion-mobile.png'),full_page=True)
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Companion layout fits a narrow phone viewport')
    fail=browser.new_context()
    fail.add_init_script("const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.startsWith('webgl')?null:old.call(this,t,...a)}")
    other=fail.new_page();other.on('pageerror',lambda e:errors.append(str(e)))
    other.goto(base+'#/quiet/pets');other.wait_for_function('()=>window.QWApp?.petView?.mode==="illustration"')
    other.locator('[data-pet-action="groom"]').click()
    check(other.locator('#pet-portrait .action-groom').is_visible(),'No-WebGL browser retains accessible pet actions')
    check(not errors,'No uncaught companion errors')
    (OUT/'companion-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'models':details,'scope':'Local headless Chromium, desktop and simulated phone; no physical-device claim'},indent=2))
    browser.close()
