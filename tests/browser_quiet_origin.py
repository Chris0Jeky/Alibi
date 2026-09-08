"""Disposable Chromium profiles: source routing, save conflicts, recovery, offline and A/B update.
No hosted origin or physical device is certified by this suite.
"""
from pathlib import Path
import json, tempfile, threading, re
from playwright.sync_api import sync_playwright
from browser_update import make_releases, MutableStaticServer, dismiss_lesson, make_sudoku_move

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/quiet-wing'
OUT.mkdir(parents=True, exist_ok=True)
checks, errors = [], []

def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)

def quiet(page, base, route='realm'):
    page.goto(base + '/#/quiet/' + route)
    page.wait_for_function('()=>window.AlibiActivities?.diagnostics().active')

def rename(page, name):
    page.locator('#realmname').fill(name)
    page.locator('#realmname').press('Tab')
    page.evaluate('()=>QWApp.flush()')

def stored(page, key='state'):
    return page.evaluate('''key => new Promise((resolve,reject)=>{
      const r=indexedDB.open('alibi-quiet-wing-v1'); r.onerror=()=>reject(r.error);
      r.onsuccess=()=>{const db=r.result,tx=db.transaction('saves','readonly'),q=tx.objectStore('saves').get(key);
      tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};
    })''', key)

fixture, release_a, release_b = make_releases()
# B changes the optional entry script too, so an older Wing tab must still load its A assets.
bmain = next((release_b/'assets').glob('alibi.*.js'))
text = bmain.read_text(encoding='utf-8')
m = re.search(r'globalThis.ALIBI_QUIET_CONFIG=(.*?);\n', text)
cfg = json.loads(m.group(1)); old = cfg['script']; new = old.replace('.js', '-fixture-b.js')
sources_a=cfg['sources']; sources_b='./quiet-wing-sources.0123456789ab.html'
(release_b/sources_b.removeprefix('./')).write_text((release_b/sources_a.removeprefix('./')).read_text(encoding='utf-8').replace('</main>','<p id="release-b-credits">New release credits</p></main>'),encoding='utf-8')
(release_b/new.removeprefix('./')).write_text((release_b/old.removeprefix('./')).read_text(encoding='utf-8')+'\nwindow.QWFixture="B";', encoding='utf-8')
cfg.update(script=new, build=cfg['build']+'-b', files=[new if x==old else x for x in cfg['files']])
cfg.update(sources=sources_b, files=[sources_b if x==sources_a else x for x in cfg['files']])
bmain.write_text(text[:m.start(1)]+json.dumps(cfg,separators=(',',':'))+text[m.end(1):],encoding='utf-8')
server=MutableStaticServer(release_a)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_address[1]}'
try:
  with tempfile.TemporaryDirectory(prefix='alibi-qw-profile-') as profile, sync_playwright() as pw:
    def launch():
      return pw.chromium.launch_persistent_context(profile,headless=True,viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce')
    ctx=launch(); cabinet=ctx.pages[0]; cabinet.on('pageerror',lambda e:errors.append(str(e)))
    requests=[];cabinet.on('request',lambda r:requests.append(r.url))
    cabinet.goto(base+'/#/play/sudoku-01@1');cabinet.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()');dismiss_lesson(cabinet)
    first=make_sudoku_move(cabinet,1)
    cabinet.wait_for_function('()=>!!navigator.serviceWorker.controller')
    check(not cabinet.evaluate('!!window.QWEngine'),'Cabinet does not execute Quiet Wing code')
    check(not any('quiet-activity.' in u for u in requests),'Cabinet does not request the activity script')
    club_before=cabinet.evaluate('AlibiClub.diagnostics().state.runs')
    wing=ctx.new_page();wing.on('pageerror',lambda e:errors.append(str(e)));quiet(wing,base)
    wing.wait_for_function('()=>AlibiActivities.diagnostics().offline')
    check(wing.evaluate('!!navigator.serviceWorker.controller'),'Root worker controls source-native Quiet Wing route')
    check(wing.locator('#realm').is_visible(),'Root worker delivers intended Quiet Wing UI')
    rename(wing,'Persistent keep')
    check(stored(wing)['scene']['name']=='Persistent keep','Realm name commits to actual IndexedDB')
    wing.locator('.plot-controls summary').click()
    wing.locator('#plot-x').select_option(index=4);wing.locator('#plot-y').select_option(index=4)
    check('Plot 5, 5' in wing.locator('#plot-summary').inner_text(),'Non-canvas plot inspector announces selected plot')
    before=wing.evaluate('QWApp.state.stats.built');wing.locator('#plot-apply').click();wing.evaluate('()=>QWApp.flush()')
    check(wing.evaluate('QWApp.state.stats.built')==before+1,'Non-canvas control applies one edit')
    for route in ['pets','garden','realm','pets','realm']:
      wing.evaluate('(r)=>location.hash="/quiet/"+r',route)
      wing.wait_for_function('(r)=>QWApp.route===r',arg=route)
    check(wing.evaluate('QWApp.gardenTimer===null && QWApp.petTimer===null'),'Leaving timed activities disposes their timers')
    wing.evaluate('location.hash="/home"');wing.wait_for_function('()=>!AlibiActivities.diagnostics().active')
    check(wing.evaluate('QWApp.renderer===null && QWApp.resizeObs===null'),'Leaving wing disposes renderer and ResizeObserver')
    check(cabinet.evaluate('AlibiDiagnostics.getCurrent().state')==first['state'],'Quiet Wing leaves puzzle state unchanged')
    check(cabinet.evaluate('AlibiClub.diagnostics().state.runs')==club_before,'Quiet Wing leaves Club runs unchanged')
    quiet(wing,base);check(wing.evaluate('QWApp.state.scene.name')=='Persistent keep','Re-entry reads committed state')
    stale=ctx.new_page();quiet(stale,base)
    rename(wing,'Newer committed keep')
    stale.locator('#realmname').fill('Stale keep');stale.locator('#realmname').press('Tab')
    stale.wait_for_function('()=>QWStore.info().blocked')
    check(stored(wing)['scene']['name']=='Newer committed keep','Stale tab cannot overwrite newer committed save')
    stale.locator('[data-act="settings"]').click()
    with stale.expect_download() as d: stale.locator('#backup-export').click()
    path=OUT/'stale-session.json';d.value.save_as(path)
    check(json.loads(path.read_text())['state']['scene']['name']=='Stale keep','Conflicted session is exportable')
    stale.close()
    # One entry point exports all namespaces; reviewing and canceling changes none.
    wing.evaluate('location.hash="/settings"');wing.locator('[data-action="export-all"]').wait_for()
    with wing.expect_download() as d: wing.locator('[data-action="export-all"]').click()
    bundle=OUT/'all-saves.json';d.value.save_as(bundle);data=json.loads(bundle.read_text())
    check(data['manifest']==['cabinet','club','quiet'],'Combined backup names all three stores')
    check(data['sections']['quiet']['state']['scene']['name']=='Newer committed keep','Combined backup uses latest committed Quiet Wing state')
    before=stored(wing)
    wing.locator('[data-action="import-all"]').click();wing.locator('#all-backup-input').set_input_files(bundle)
    wing.locator('[data-action="all-quiet"]').wait_for()
    check(stored(wing)==before,'Combined staging performs no writes')
    wing.locator('[data-action="all-quiet"]').click();wing.locator('#confirm-import').wait_for();wing.locator('#confirm-import').click()
    wing.locator('#modal').wait_for(state='hidden')
    check(stored(wing,'recovery')['state']['scene']['name']=='Newer committed keep','Section restore keeps committed recovery copy')
    check(cabinet.evaluate('AlibiDiagnostics.getCurrent().state')==first['state'],'Quiet section restore does not change cabinet run')
    # Explicit activation from the wing with an older puzzle tab still open.
    old_version=wing.evaluate('ALIBI_CONFIG.version');loads=[];cabinet.on('load',lambda _:loads.append(1))
    old_wing=ctx.new_page();quiet(old_wing,base);old_wing_loads=[];old_wing.on('load',lambda _:old_wing_loads.append(1))
    server.root=release_b
    wing.evaluate('async()=>{const r=await navigator.serviceWorker.ready;await r.update()}')
    wing.locator('[data-action="apply-update"]').wait_for()
    wing.locator('#realmname').fill('Saved before update');wing.locator('#realmname').press('Tab')
    wing.locator('[data-action="apply-update"]').click()
    wing.wait_for_function('(v)=>window.AlibiDiagnostics && ALIBI_CONFIG.version!==v',arg=old_version)
    wing.wait_for_function('()=>window.QWFixture==="B" && AlibiActivities.diagnostics().offline')
    check(wing.evaluate('QWApp.state.scene.name')=='Saved before update','Explicit update flushes pending Quiet Wing edits')
    check(not loads and cabinet.evaluate('ALIBI_CONFIG.version')==old_version,'Older cabinet tab is not forcibly reloaded')
    check(cabinet.evaluate('AlibiDiagnostics.getCurrent().state')==first['state'],'Older cabinet tab retains its original puzzle run')
    check(not old_wing_loads and old_wing.evaluate('ALIBI_CONFIG.version')==old_version,'Older Quiet Wing tab is not forcibly reloaded')
    check(old_wing.locator('#realm').is_visible(),'Older Quiet Wing renderer survives controller change')
    old_bytes=old_wing.evaluate('async()=>{const r=await fetch(ALIBI_QUIET_CONFIG.script);return {ok:r.ok,body:await r.text()}}')
    check(old_bytes['ok'] and 'window.QWFixture="B"' not in old_bytes['body'],'Older Quiet Wing assets remain available from the previous optional pack')
    # Cold browser-process restart and offline entry use the optional pack under root control.
    ctx.close();ctx=launch();ctx.set_offline(True);wing=ctx.pages[0];quiet(wing,base)
    check(wing.evaluate('QWApp.state.scene.name')=='Saved before update','Cold process restart works offline with committed state')
    wing.evaluate('location.hash="/quiet/gallery"');wing.locator('.art-frame img').first.wait_for()
    check(wing.locator('.art-frame img').evaluate_all('(imgs)=>imgs.every(i=>i.complete && i.naturalWidth>0)'),'All four museum images decode offline')
    wing.evaluate('location.hash="/play/sudoku-01@1"');wing.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()')
    check(wing.evaluate('AlibiDiagnostics.getCurrent().state')==first['state'],'Original puzzle also survives offline restart')
    wing.goto(base+'/quiet-wing-sources.html');check(wing.locator('h1').inner_text()=='Quiet Wing sources','Source credits remain readable under the root worker offline')
    wing.goto(base+'/'+sources_b.removeprefix('./'));check(wing.locator('#release-b-credits').count()==1,'New release caches its own changed credits instead of copying the older page')
    wing.goto(base+'/'+sources_a.removeprefix('./'));check(wing.locator('#release-b-credits').count()==0,'Older versioned credits remain available for older open tabs')
    ctx.close()
    # Unknown future database schema remains protected and can be exported raw.
    future=pw.chromium.launch();ctx=future.new_context();page=ctx.new_page();page.goto(base)
    page.evaluate('''()=>new Promise((resolve,reject)=>{const r=indexedDB.open('alibi-quiet-wing-v1',2);r.onupgradeneeded=()=>r.result.createObjectStore('future');r.onsuccess=()=>{const db=r.result,tx=db.transaction('future','readwrite');tx.objectStore('future').put({mystery:42},'keep');tx.oncomplete=()=>{db.close();resolve()}};r.onerror=()=>reject(r.error)})''')
    quiet(page,base)
    check(page.evaluate('QWStore.info().blocked && QWStore.info().mode==="protected"'),'Future database version cannot become a writable fallback')
    page.locator('[data-act="settings"]').click()
    with page.expect_download() as d:page.locator('#raw-export').click()
    path=OUT/'future-raw.json';d.value.save_as(path)
    check(json.loads(path.read_text())['stores']['future'][0]['value']=={'mystery':42},'Raw recovery exports unknown future records unchanged')
    page.locator('[data-close]').click();page.evaluate('location.hash="/home"');page.wait_for_function('()=>!AlibiActivities.diagnostics().active')
    page.evaluate('()=>{QWRealm.Renderer=class {constructor(){throw Error("Deliberate renderer failure")}};location.hash="/quiet/realm"}')
    page.get_by_text('Deliberate renderer failure',exact=False).wait_for()
    check(page.get_by_role('link',name='Return to Alibi',exact=True).is_visible(),'Failed shadow mount exposes a visible return link')
    page.get_by_role('link',name='Return to Alibi',exact=True).click();page.wait_for_function('()=>!AlibiActivities.diagnostics().active')
    check(page.evaluate('QWApp.renderer===null && QWApp.resizeObs===null'),'Failed mount disposes its activity resources')
    # A stalled open must not create a competing, writable fallback save.
    timeout_ctx=future.new_context();timeout_page=timeout_ctx.new_page();quiet(timeout_page,base)
    rename(timeout_page,'Original after retry');timeout_before=stored(timeout_page)
    timeout_page.add_init_script('''(() => {const open=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{
      if(args[0]==='alibi-quiet-wing-v1'&&!sessionStorage.getItem('tested-stall')){
        sessionStorage.setItem('tested-stall','1');return {};
      }return open(...args);
    }})()''')
    timeout_page.reload();timeout_page.wait_for_function('()=>window.AlibiActivities?.diagnostics().active')
    check(timeout_page.evaluate('QWStore.info().blocked && QWStore.info().mode==="protected"'),'Stalled real-origin database open stays protected')
    check(timeout_page.evaluate('()=>QWStore.write(QWApp.state).then(()=>false,()=>true)'),'Stalled open refuses a competing save')
    check(timeout_page.evaluate('localStorage.getItem("alibi-quiet-wing-v1:fallback")===null'),'Stalled open does not create fallback data')
    timeout_page.reload();timeout_page.wait_for_function('()=>window.AlibiActivities?.diagnostics().active')
    check(timeout_page.evaluate('QWApp.state.scene.name')=='Original after retry' and stored(timeout_page)==timeout_before,'Retry recovers the exact original committed state')
    timeout_ctx.close();future.close()
    check(not errors,'No unhandled errors in origin, restart and update tests')
finally:
    server.shutdown();server.server_close();fixture.cleanup()
(OUT/'origin-results.json').write_text(json.dumps({'passed':True,'checks':len(checks),'details':checks,'errors':errors,'scope':'Disposable local Chromium profiles and synthetic A/B releases. No hosted or physical-device acceptance.'},indent=2))
