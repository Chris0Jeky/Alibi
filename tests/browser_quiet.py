"""Quiet Wing real-origin controls; local Chromium is not hosted or physical Android evidence."""
from pathlib import Path
import json,zipfile,os,shutil
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]; out=root/'test-results/quiet-wing';out.mkdir(exist_ok=True,parents=True)
solutions=json.loads((root/'tests/quiet-wing/solutions.json').read_text());checks=[];errors=[]
def check(v,s):
 assert v,s
 checks.append(s)
def go(page,route):
 page.evaluate("(r)=>location.hash='/quiet/'+r",route);page.wait_for_function('(r)=>QWApp.route===r.split("/")[0] && (!r.includes("/") || QWApp.classic===r.split("/")[1])',arg=route);page.wait_for_timeout(80)
def shot(page,name):page.screenshot(path=str(out/(name+'.png')),full_page=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')+'#/quiet/realm');page.wait_for_function('()=>window.AlibiActivities?.diagnostics().active');page.wait_for_timeout(100)
 check(page.evaluate('QWStore.info().mode')=='indexeddb','Real origin uses IndexedDB')
 check(page.evaluate('QWApp.state.scene.tiles.length')==196,'Realm has 196 plots')
 shot(page,'realm-desktop')
 for v in ['diorama','plan','isometric']:
  page.locator(f'[data-view="{v}"]').click();check(page.evaluate('QWApp.state.scene.camera.view')==v,f'{v} camera works')
 page.locator('[data-ract="rotate"]').click();check(page.evaluate('QWApp.state.scene.camera.angle')==1,'Camera rotation stored');page.locator('[data-ract="sky"]').click();shot(page,'realm-golden-hour')
 for cat in ['Castle','Countryside','Nature','Details','Modules','Ground','Tools','Homes']:
  page.locator(f'[data-category="{cat}"]').click();check(page.locator('#models button').count()>0,f'{cat} tray populated')
 # Empty island through actual confirmation.
 page.locator('#preset').select_option('empty');page.locator('#new-confirm').click();check(page.evaluate('QWApp.state.scene.tiles.every(t=>!t.items.length)'),'Preset confirmation empties only realm')
 page.locator('[data-category="Modules"]').click();page.locator('[data-type="stone"]').click()
 def cellpos(page,index=104):
  return page.evaluate('''(index)=>{let r=QWApp.renderer,b=r.canvas.getBoundingClientRect();for(const f of r.faces){if(f.index!==index)continue;let x=f.p.reduce((n,v)=>n+v[0],0)/f.p.length,y=f.p.reduce((n,v)=>n+v[1],0)/f.p.length;if(r.pick(x,y)===index)return {x:b.left+x,y:b.top+y};}throw Error('No visible tile '+index);}''',index)
 pos=cellpos(page);page.mouse.click(**pos);check(page.evaluate('QWApp.state.scene.tiles[104].items.length')==1,'Actual canvas click places selected piece')
 for type in ['timber','roof']:
  page.locator(f'[data-type="{type}"]').click();pos=cellpos(page);page.mouse.click(**pos)
 check(page.evaluate('QWApp.state.scene.tiles[104].items.map(i=>i.type).join()')=='stone,timber,roof','Three modular pieces stack')
 page.mouse.click(**cellpos(page));check(page.evaluate('QWApp.state.scene.tiles[104].items.length')==3,'Stacking above a roof is rejected')
 page.locator('[data-ract="undo"]').click();check(page.evaluate('QWApp.state.scene.tiles[104].items.length')==2,'Realm undo')
 page.locator('[data-ract="redo"]').click();check(page.evaluate('QWApp.state.scene.tiles[104].items.length')==3,'Realm redo')
 page.locator('#realmname').fill('The Test Keep');page.locator('#realmname').press('Tab');check(page.evaluate('QWApp.state.scene.name')=='The Test Keep','Rename actual input')
 for kind in ['json','png','svg','obj']:
  page.locator('[data-ract="export"]').click()
  with page.expect_download() as dl:page.locator(f'[data-export="{kind}"]').click()
  d=dl.value;path=out/('export-'+d.suggested_filename);d.save_as(str(path));check(path.stat().st_size>100,kind+' export has actual bytes')
  if kind=='json':check(json.loads(path.read_text())['tiles'][104]['items'][-1]['type']=='roof','JSON includes actual edit')
  if kind=='obj':
   with zipfile.ZipFile(path) as z:
    check(z.testzip() is None,'OBJ ZIP has valid CRCs');obj=z.read('realm.obj').decode();mtl=z.read('realm.mtl').decode();check('usemtl' in obj and 'Kd ' in mtl and 'NaN' not in obj,'OBJ has finite vertices and paired materials')
 # All classic solutions, actual buttons (never inject solved board).
 for id,actions in solutions.items():
  go(page,'classics/'+id)
  for a in actions:
   if id.startswith('hanoi'):
    page.locator(f'[data-peg="{a["from"]}"]').click();page.locator(f'[data-peg="{a["to"]}"]').click()
   elif id=='river':page.locator(f'[data-passenger="{a["item"]}"]').click()
   elif id=='jugs':page.locator(f'[data-jug="{a["i"]}"][data-kind="{a["kind"]}"]').click()
   elif id=='magic':
    page.locator(f'[data-magic="{a["from"]}"]').click();page.locator(f'[data-magic="{a["to"]}"]').click()
   elif id.startswith('slide-'):page.locator(f'[data-slide="{a["cell"]}"]').click()
   else:page.locator(f'[data-cell="{a["cell"]}"]').click()
  check(page.evaluate('(id)=>QWEngine.classicWon(QWApp.state.classics[id].state)',id),id+' completed through controls')
  check(page.locator('#classic-result').inner_text().find('You found a way')>=0,id+' completion visible')
  page.locator('#classic-undo').click();check(not page.evaluate('(id)=>QWEngine.classicWon(QWApp.state.classics[id].state)',id),id+' undo restores prior board')
  if id=='hanoi3':shot(page,'hanoi-desktop')
 go(page,'pets')
 for species in ['cat','fox','owl','dragon']:
  page.locator(f'[data-species="{species}"]').click()
  for a in ['pet','treat','play','groom','nap']:
   page.locator(f'[data-pet-action="{a}"]').click();check(page.evaluate('QWApp.petAction')==a,f'{species} {a} changes animation state')
 check(page.evaluate('QWApp.state.stats.species.length')==4,'Four species recorded')
 page.locator('[data-species="dragon"]').click();shot(page,'companions-desktop')
 page.locator('#walk-start').click();check(page.evaluate('QWApp.state.pets.trip!==null'),'Stroll starts')
 # Explicit clock fixture, not pretending to wait a physical minute.
 page.evaluate('QWApp.state.pets.trip.started-=61000');page.wait_for_timeout(1100)
 page.locator('#collect-trip').click();check(page.evaluate('QWApp.state.stats.walks')==1,'Completed timestamp fixture can be collected once')
 go(page,'garden');page.locator('[data-seed="lavender"]').click();page.locator('[data-pot="0"]').click();check(page.evaluate('QWApp.state.garden.pots[0].seed')=='lavender','Seed and pot controls plant')
 page.evaluate('QWApp.state.garden.pots[0].plantedAt-=301000');page.wait_for_timeout(1100);page.locator('[data-pot="0"]').click();check(page.evaluate('QWApp.state.stats.harvests')==1,'Timestamp-grown flower can be harvested')
 for i in range(6):page.locator(f'[data-pot="{i}"]').click()
 page.evaluate('QWApp.state.garden.pots.forEach((p,i)=>{if(p)p.plantedAt-=i*50000})');page.wait_for_timeout(1100);shot(page,'garden-desktop')
 go(page,'journal');check(page.locator('.badge').count()==25,'25 badge records visible');shot(page,'journal-desktop')
 go(page,'gallery');check(page.locator('[data-load-art]').count()==4,'Four curated museum records offered separately from local assets')
 check(page.locator('.art-frame img').count()==4,'Four museum images are packaged locally')
 # Settings + invalid import do not wipe state.
 page.locator('[data-act="settings"]').click()
 with page.expect_download() as dl:page.locator('#backup-export').click()
 dl.value.save_as(str(out/'backup.json'));backup=json.loads((out/'backup.json').read_text());check(backup['state']['scene']['name']=='The Test Keep','Wing backup reflects actual realm and activity')
 page.locator('[data-close]').click()
 page.locator('#file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"kind":"alibi-realm","schema":99}'})
 page.wait_for_timeout(100);check(page.evaluate('QWApp.state.scene.name')=='The Test Keep','Invalid import preserves existing realm')
 # Full backup import through validation and confirmation with committed recovery.
 page.locator('#file').set_input_files(str(out/'backup.json'));page.locator('#confirm-import').click();page.wait_for_timeout(200);check(page.evaluate('QWApp.state.stats.walks')==1,'Validated backup restore preserves stroll')
 # Check every principal route at phone, tablet and desktop widths.
 routes=['realm','pets','garden','classics','classics/hanoi5','classics/jugs','classics/river','classics/queens','classics/knight','classics/magic','classics/slide-town','gallery','journal']
 for width in [360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900})
  for route in routes:
   go(page,route);check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'No page overflow {width} {route}')
   if width==390 and route in ['realm','pets','classics/queens','garden']:shot(page,route.replace('/','-')+'-mobile')
 go(page,'realm');page.locator('[data-act="zen"]').first.click();check(page.locator('.rail').is_hidden(),'Zen removes navigation');check(page.locator('#realm').is_visible(),'Zen preserves canvas');shot(page,'realm-zen');page.locator('#realm').focus();page.keyboard.press('Escape');check(not page.evaluate('QWApp.state.settings.zen'),'Escape leaves Zen')
 # Touch context uses actual pointer-capable Chromium, not a physical Android device.
 touch=ctx.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 phone=touch.new_page();phone.on('pageerror',lambda e:errors.append(str(e)));phone.goto(os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')+'#/quiet/realm');phone.wait_for_function('()=>window.AlibiActivities?.diagnostics().active');
 phone.locator('[data-ract="palette"]').click();phone.locator('#newempty').click();phone.locator('#new-confirm').click();pos=cellpos(phone)
 phone.touchscreen.tap(pos['x'],pos['y']);check(phone.evaluate('QWApp.state.stats.built')==0,'Touch tap selects without accidental placement');phone.locator('#place').click();check(phone.evaluate('QWApp.state.stats.built')==1,'Touch confirmation places once')
 page.evaluate('()=>QWApp.flush()');check(not errors,'No uncaught page errors')
 report={'passed':True,'checks':len(checks),'details':checks,'errors':errors,'scope':'Actual Chromium controls at a real local origin with IndexedDB. Hosted release and physical Android/TalkBack remain separate gates. Garden/stroll tests advance saved timestamps explicitly.'};(out/'controls-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':True,'checks':len(checks),'errors':errors}));b.close()
