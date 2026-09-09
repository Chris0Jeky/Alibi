"""Real Chromium DOM/control checks in an isolated page. Not a hosted PWA/device test.
Optional test dependency: python -m pip install playwright; playwright install chromium.
Use CHROMIUM_PATH to override the Chromium executable when needed.
"""
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PUZZLES=json.loads((ROOT/'content/catalog.json').read_text())['puzzles']
CURATED=os.environ.get('ALIBI_CURATION_UI')=='1'
if CURATED:
    PUZZLES=[p for f in sorted((ROOT/'content/curation/packs').glob('*.json')) for p in json.loads(f.read_text())['puzzles']]
checks=[]; errors=[]; shots=ROOT/'tests/screenshots';shots.mkdir(exist_ok=True)
def check(value,label):
    assert value,label
    checks.append(label)
    print('PASS',label,flush=True)
with sync_playwright() as pw:
    launch={'headless':True,'args':['--no-sandbox']}
    if os.environ.get('CHROMIUM_PATH'): launch['executable_path']=os.environ['CHROMIUM_PATH']
    elif Path('/usr/bin/chromium').exists(): launch['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**launch)
    context=browser.new_context(viewport={'width':int(os.environ.get('ALIBI_UI_WIDTH','1440')),'height':1000},accept_downloads=True,reduced_motion='reduce')
    page=context.new_page();page.set_default_timeout(5000)
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content((ROOT/'alibi-deluxe-play.html').read_text(),wait_until='load')
    page.wait_for_function('window.AlibiDiagnostics')
    def action(a,extra=''):
        page.locator(f'[data-action="{a}"]'+extra).first.click()
    def dismiss():
        if page.locator('dialog[open]').count():
            action('close-dialog')
    def route(path):
        dismiss();page.evaluate('(p)=>location.hash="#/"+p',path);page.wait_for_timeout(80)
    def state(): return page.evaluate('AlibiDiagnostics.getCurrent()')
    def open_p(p):
        route('play/'+p['id']+'@'+str(p['revision']))
        page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id',arg=p['id'])
        page.wait_for_timeout(70)
    def cell(i): action('cell',f'[data-cell="{i}"]')
    def completed():
        page.wait_for_function('AlibiDiagnostics.getCurrent()?.completedAt')
        dismiss()
    check(page.title().startswith('Alibi'),'Application title and boot')
    check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==324,'All 324 puzzles loaded')
    check(page.evaluate('AlibiDiagnostics.getCounts().types')==13,'All thirteen engines loaded')
    page.screenshot(path=str(shots/'desktop-home.png'),full_page=True)
    for typ in ['scene','dossier','witness','sudoku','nonogram','binary','futoshiki','lightup','tents','aquarium','network','trail','bridges']:
        p=next(p for p in PUZZLES if p['type']==typ)
        open_p(p)
        check(page.locator('dialog[open]').count()==1,typ+' first-play lesson opens')
        action('lesson-example')
        if typ=='scene':action('lesson-person')
        targets={'scene':[5],'dossier':[0],'witness':[1],'sudoku':[4],'nonogram':[1,2,3,4],'binary':[1],'futoshiki':[3],'lightup':[0],'tents':[1],'aquarium':[2],'network':[1],'trail':[1],'bridges':[2]}[typ]
        for i in targets:action('lesson-tap',f'[data-cell="{i}"]')
        check(page.locator('.lesson-success').count()==1,typ+' miniature lesson responds correctly')
        action('lesson-finish');check(page.locator('dialog[open]').count()==0,typ+' lesson leads into game')
        if typ=='scene':
            for person in p['people']:
                action('person',f'[data-id="{person["id"]}"]');cell(p['solution'][person['id']])
            check(len(state()['state']['placements'])==5,'Scene tokens placed through controls')
            action('undo');check(len(state()['state']['placements'])==4,'Undo removes last placement')
            action('redo');check(len(state()['state']['placements'])==5,'Redo reinstates placement')
            victim=p['solution'][p['victim']]
            culprit=next(w['id'] for w in p['people'] if w['id']!=p['victim'] and p['rooms'][p['solution'][w['id']]]==p['rooms'][victim])
            check(state()['completedAt'] is None,'Scene waits for explicit accusation')
            action('choose-accuse',f'[data-id="{culprit}"]');action('submit-accuse')
        elif typ=='dossier':
            n=p['size']
            for cat in range(2):
                action('dossier-tab',f'[data-value="{cat}"]')
                for r in range(n):action('mark',f'[data-cell="{cat*n*n+r*n+p["solution"][cat*n+r]}"]')
            culprit=p['solution'][n:].index(p['targetItem']);action('choose-accuse',f'[data-id="{culprit}"]');action('submit-accuse')
        elif typ=='witness':
            wrong=(p['solution']+1)%p['size'];action('choose-accuse',f'[data-id="{wrong}"]');action('submit-accuse')
            check(state()['completedAt'] is None,'Wrong witness accusation does not complete')
            action('choose-accuse',f'[data-id="{p["solution"]}"]');action('submit-accuse')
        elif typ in ['sudoku','futoshiki']:
            for i,value in enumerate(p['solution']):
                if not p['givens'][i]:cell(i);action('value',f'[data-value="{value}"]')
        elif typ=='binary':
            for i,value in enumerate(p['solution']):
                if p['givens'][i]==-1:
                    action('symbol',f'[data-value="{value}"]');cell(i)
        elif typ in ['nonogram','lightup','tents']:
            for i,value in enumerate(p['solution']):
                if value==1:cell(i)
        elif typ=='aquarium':
            n=p['size']
            for tank,level in enumerate(p['solution']):
                if level:
                    rows=sorted(set(i//n for i,t in enumerate(p['tanks']) if t==tank),reverse=True)
                    row=rows[level-1];i=next(i for i,t in enumerate(p['tanks']) if t==tank and i//n==row);cell(i)
        elif typ=='network':
            for i,turns in enumerate(p['solution']):
                for _ in range(turns):cell(i)
        elif typ=='trail':
            for i,value in enumerate(p['solution']):
                if not p['givens'][i]:action('trail-value',f'[data-value="{value}"]');cell(i)
        elif typ=='bridges':
            edges=page.evaluate('(p)=>AlibiCore.bridges.graph(p).edges',p)
            for edge,value in zip(edges,p['solution']):
                for _ in range(value):
                    cell(p['islands'][edge['a']]['cell']);cell(p['islands'][edge['b']]['cell'])
        completed();check(bool(state()['completedAt']),typ+' completed entirely through UI')
        action('review-record');check(page.locator('.debrief-list li').count()>0,typ+' completed record can be reopened');dismiss()
        if typ in ['dossier','lightup','aquarium','network']:page.screenshot(path=str(shots/f'desktop-{typ}.png'),full_page=True)
    # In-progress pencil/erase/pause/hint and routing durability (same document, not reload).
    page.set_viewport_size({'width':1440,'height':1000})
    p=[p for p in PUZZLES if p['type']=='sudoku'][1];open_p(p);dismiss()
    i=next(i for i,v in enumerate(p['givens']) if not v);cell(i);action('pencil');action('value','[data-value="1"]')
    check(1 in state()['state']['notes'].get(str(i),[]),'Pencil marks stored without filling value')
    action('pencil');action('erase');check(not state()['state']['notes'].get(str(i)),'Erase clears notes')
    action('pause');check(page.locator('.paused-cover').count()>0,'Pause hides puzzle');page.locator('.paused-cover [data-action="pause"]').click()
    hint_before=state()['state'];action('hint');check(page.locator('dialog[open]').count()==1 and state()['state']==hint_before,'Hint opens without changing board');dismiss()
    cell(i);action('value',f'[data-value="{p["solution"][i]}"]');before=state()['state'];route('home');open_p(p);dismiss()
    check(state()['state']==before,'In-progress state survives route navigation')
    # Responsive layout: all primary routes and all twelve board families.
    layout_paths=['home','library','casebooks','casebooks/briar-house','casebooks/last-light-at-bellweather','journal','workshop','settings','privacy']+['play/'+next(p['id'] for p in PUZZLES if p['type']==t)+'@1' for t in ['scene','dossier','witness','sudoku','nonogram','binary','futoshiki','lightup','tents','aquarium','network','trail','bridges']]
    for width in [360,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for path in layout_paths:
            route(path);dismiss()
            overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
            check(not overflow,f'No page overflow at {width}px: {path}')
        if width==390:
            route('home');page.screenshot(path=str(shots/'mobile-home.png'),full_page=True)
            route('play/scene-02@1');dismiss()
            action('quick-panel','[data-value="clues"]');check(page.locator('dialog.quick-sheet[open]').count()==1,'Mobile evidence opens without leaving board')
            action('quick-clue','[data-index="0"]');check(0 in state()['state']['clueMarks'],'Mobile evidence checks synchronise with puzzle')
            page.screenshot(path=str(shots/'mobile-evidence-sheet.png'),full_page=False);dismiss()
            action('quick-panel','[data-value="notes"]');page.locator('#quick-notes').fill('Compare the dining-car clue.');dismiss()
            check(state()['note']=='Compare the dining-car clue.','Mobile notes remain with the case')
            page.screenshot(path=str(shots/'mobile-scene.png'),full_page=True)
            route('play/aquarium-02@1');dismiss();page.screenshot(path=str(shots/'mobile-aquarium.png'),full_page=True)
    # Worker-backed workshop, real browser Blob worker.
    page.set_viewport_size({'width':1440,'height':1000});route('workshop')
    page.locator('#draft-title').fill('The tester’s missing key')
    page.locator('#draft-names').fill('Ada, Ben, Cora, Dax, Eve')
    page.locator('#draft-seed').fill('405')
    page.locator('#scene-form button[type=submit]').click()
    page.locator('[data-action="add-draft"]:enabled').wait_for(timeout=30000)
    check('unique solution' in page.locator('.draft-editor').inner_text(),'Workshop generates independently verified scene')
    check(page.locator('#draft-title').input_value()=='The tester’s missing key','Workshop form values survive rerender')
    with page.expect_download() as dl:action('export-draft')
    draft=json.loads(Path(dl.value.path()).read_text());check(draft['puzzles'][0]['people'][0]['name']=='Ada','Workshop retains custom names')
    page.locator('#room-name-0').fill('Garden room');page.locator('#room-name-0').blur()
    check(page.locator('[data-action="add-draft"]').is_disabled(),'Editing invalidates verification')
    action('verify-draft');page.locator('[data-action="add-draft"]:enabled').wait_for(timeout=30000)
    check('Verified:' in page.locator('#draft-verification').inner_text(),'Edited scene can be reverified')
    page.screenshot(path=str(shots/'desktop-workshop.png'),full_page=True)
    action('add-draft');page.wait_for_function('AlibiDiagnostics.getCounts().customPacks===1')
    check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==325,'Verified custom scene installs locally')
    # Invalid pack is rejected without any mutation.
    page.locator('#pack-input').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"schemaVersion":99}'})
    page.wait_for_timeout(300);check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==325,'Bad pack cannot modify catalogue')
    route('settings')
    with page.expect_download() as dl:action('export')
    backup=json.loads(Path(dl.value.path()).read_text());check(backup['format']=='alibi-backup' and len(backup['runs'])>=12,'Backup exports actual played states')
    check(len(backup['packs'])==1,'Backup includes custom pack')
    page.locator('#backup-input').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
    page.wait_for_timeout(150);check(page.locator('[data-action="restore-merge"]').count()==1,'Exported backup validates on import')
    dismiss()
    # Existing runs retain their definition when the live catalogue revision changes.
    route('play/sudoku-02@1');dismiss();old_state=state()['state'];old_title=state()['puzzle']['title']
    page.evaluate("(()=>{const p=ALIBI_CATALOG.puzzles.find(p=>p.id==='sudoku-02');p.revision=2;p.title='Revision two test';})()")
    route('home');route('play/sudoku-02@1');dismiss()
    check(state()['puzzle']['title']==old_title and state()['state']==old_state,'Saved run keeps original definition after catalogue revision changes')
    route('play/sudoku-02@2');dismiss();check(state()['puzzle']['title']=='Revision two test' and state()['moves']==0,'New revision creates separate run')
    # Revert this test-only catalogue mutation before any further exports.
    page.evaluate('(title)=>{const p=ALIBI_CATALOG.puzzles.find(p=>p.id==="sudoku-02");p.revision=1;p.title=title;}',old_title)
    check(not errors,'No uncaught browser exceptions')
    (ROOT/'tests/browser-results.json').write_text(json.dumps({'passed':True,'assertions':len(checks),'checks':checks,'errors':errors,'browser':browser.version,'build':page.evaluate('ALIBI_CONFIG.build'),'scope':'Chromium isolated page via set_content; real DOM, controls, Blob workers and downloads; not hosted navigation, IndexedDB persistence, real service worker or Android.'},indent=2))
    browser.close()
print('PASS',len(checks),'browser checks')
