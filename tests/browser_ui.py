"""Real Chromium DOM/control checks in an isolated page. Not a hosted PWA/device test.
Optional test dependency: python -m pip install playwright; playwright install chromium.
Use CHROMIUM_PATH to override the Chromium executable when needed.
"""
import json, os, time
from pathlib import Path
from official_fixture import OFFICIAL_COUNT
from playwright.sync_api import expect, sync_playwright
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
    check(page.evaluate("()=>ALIBI_BUILD_TARGET==='standalone' && AlibiPlatform.build.target==='web' && AlibiPlatform.capabilities().nativeHost===false"),'Standalone uses the explicit browser platform')
    route('settings')
    page.locator('[data-setting="haptics"]').check()
    page.evaluate("""() => {
      globalThis.failedVibrationAttempts = 0;
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value() {
        globalThis.failedVibrationAttempts++;
        throw new Error('fixture unavailable vibration');
      }});
    }""")
    route('home')
    check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==OFFICIAL_COUNT,'All registered puzzles loaded')
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
    action('pause');check(page.locator('.paused-cover').count()>0,'Pause hides puzzle')
    check(page.evaluate("""() => {
      const active = document.activeElement, cover = document.querySelector('.paused-cover');
      const cell = document.querySelector('.board-card [id^="cell-"]');
      return !!(cover && cover.contains(active) && cell && cell.closest('[inert]'));
    }"""),'Pause puts focus on the cover and leaves the board inert')
    page.keyboard.press('n')
    check(page.locator('[data-action="pencil"].active').count()==0,'Pencil stays off while paused')
    page.locator('.board-card [data-action="hint"]').evaluate('el => el.click()')
    check(page.locator('dialog[open]').count()==0,'Hint does not open while paused')
    page.locator('.paused-cover [data-action="pause"]').click()
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
    page.locator('#draft-seed').fill('7')
    page.locator('#scene-form button[type=submit]').click()
    page.locator('[data-action="add-draft"]:enabled').wait_for(timeout=30000)
    check('unique solution' in page.locator('.draft-editor').inner_text(),'Workshop generates independently verified scene')
    check(page.locator('#draft-title').input_value()=='The tester’s missing key','Workshop form values survive rerender')
    with page.expect_download() as dl:action('export-draft')
    draft=json.loads(Path(dl.value.path()).read_text());check(draft['puzzles'][0]['people'][0]['name']=='Ada','Workshop retains custom names')
    # #864: an unfinished draft travels as its own file, without its answer, and replaces only after asking.
    page.set_viewport_size({'width':390,'height':1000})
    with page.expect_download() as dl:action('export-scene-draft')
    shared=json.loads(Path(dl.value.path()).read_text())
    check(dl.value.suggested_filename.endswith('.draft.json') and shared['format']=='alibi-scene-draft' and shared['schema']==1 and 'solution' not in shared['draft'],'390px: Export draft downloads the draft without its answer')
    total=page.locator('.draft-clue').count();title=page.locator('.draft-editor h2').inner_text()
    page.locator('[data-action="remove-draft-clue"]').last.click()
    check(page.locator('.draft-clue').count()==total-1,'390px: the draft is edited before importing')
    page.locator('#draft-input').set_input_files(files=[{'name':'pack.json','mimeType':'application/json','buffer':json.dumps(draft).encode()}])
    page.locator('#toasts',has_text='not an Alibi Scene Maker draft').wait_for()
    check(page.locator('.draft-clue').count()==total-1 and page.locator('dialog[open]').count()==0,'390px: a puzzle pack is refused and the draft is unchanged')
    page.locator('#draft-input').set_input_files(files=[{'name':'big.json','mimeType':'application/json','buffer':b' '*(256*1024+1)}])
    page.locator('#toasts',has_text='256 KiB').wait_for()
    check(page.locator('.draft-clue').count()==total-1,'390px: an oversize file is refused and the draft is unchanged')
    page.locator('#draft-input').set_input_files(files=[{'name':'shared.draft.json','mimeType':'application/json','buffer':json.dumps(shared).encode()}])
    page.locator('dialog[open] [data-action="replace-draft"]').wait_for()
    check(page.locator('.draft-clue').count()==total-1,'390px: nothing is replaced before the confirmation')
    action('replace-draft')
    page.locator('.draft-clue').nth(total-1).wait_for()
    check(page.locator('.draft-clue').count()==total and page.locator('.draft-editor h2').inner_text()==title,'390px: Import draft restores the shared clues and title')
    check('recheck required' in page.locator('.draft-editor').inner_text() and page.locator('[data-action="export-draft"]').is_disabled() and page.locator('[data-action="draft-solution"]').is_disabled(),'390px: an imported draft is unverified and shows no answer')
    check(not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'390px: the draft file controls have no horizontal overflow')
    page.locator('[data-action="undo-draft"]').focus();page.keyboard.press('Enter')
    check(page.locator('.draft-clue').count()==total-1,'390px: Undo restores the draft that was replaced')
    page.locator('[data-action="redo-draft"]').focus();page.keyboard.press('Enter')
    check(page.locator('.draft-clue').count()==total,'390px: Redo brings the imported draft back')
    action('verify-draft');page.locator('[data-action="export-draft"]:enabled').wait_for(timeout=30000)
    with page.expect_download() as dl:action('export-draft')
    seedless=lambda q:{k:v for k,v in q.items() if k!='authorSeed'}  # draft files strip the generator seed
    check(seedless(json.loads(Path(dl.value.path()).read_text())['puzzles'][0])==seedless(draft['puzzles'][0]),'390px: the imported draft verifies to the original puzzle')
    removed=draft['puzzles'][0]['clues'][-1]
    for width in (390,1440):
        page.set_viewport_size({'width':width,'height':1000})
        page.locator('[data-action="remove-draft-clue"]').last.click()
        page.locator('[data-action="verify-draft"]').focus();page.keyboard.press('Enter')
        comparison=page.locator('#draft-comparison');comparison.wait_for()
        check(comparison.locator('figure').count()==2,f'{width}px: two arrangements have separate captions')
        check(comparison.locator('figcaption').all_text_contents()==['Arrangement A','Arrangement B'],f'{width}px: arrangement labels')
        check(comparison.locator('.draft-difference').count()==4,f'{width}px: both moved people have non-colour borders')
        check(comparison.locator('li').count()==5 and 'Cora — changed' in comparison.inner_text() and 'Eve — changed' in comparison.inner_text(),f'{width}px: every person has readable positions and differences')
        check('row 3, column B' in comparison.inner_text() and 'row 5, column B' in comparison.inner_text(),f'{width}px: text describes both Cora positions')
        check(page.evaluate('document.activeElement.id')=='draft-comparison',f'{width}px: keyboard verification focuses the comparison')
        check(page.locator('[data-action="add-draft"]').is_disabled() and page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: ambiguous drafts cannot play or export')
        check(not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),f'{width}px: comparison has no horizontal overflow')
        comparison.screenshot(path=str(shots/f'comparison-{width}.png'))
        (shots/f'comparison-{width}.aria.txt').write_text(comparison.aria_snapshot(),encoding='utf-8')
        # Delay a genuine worker result, undo through the keyboard, then deliver it late.
        page.evaluate("""() => {
          const Native = Worker;
          window.heldDraft = null;
          window.Worker = class extends Native {
            set onmessage(callback) {
              super.onmessage = event => { window.heldDraft = () => callback(event); };
            }
          };
          window.restoreWorker = () => { window.Worker = Native; };
        }""")
        action('verify-draft');page.wait_for_function('!!window.heldDraft')
        page.locator('[data-action="undo-draft"]').focus();page.keyboard.press('Enter')
        check(page.locator('[data-action="add-draft"]').is_disabled() and page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: Undo requires fresh verification')
        page.evaluate('() => { restoreWorker(); heldDraft(); }')
        page.locator('[data-action="verify-draft"]:enabled').wait_for()
        check(comparison.count()==0 and page.locator('[data-action="add-draft"]').is_disabled(),f'{width}px: Undo prevents late comparison from returning')
        check(page.locator('.draft-clue').count()==len(draft['puzzles'][0]['clues']),f'{width}px: Undo restores all original clues')
        page.locator('[aria-label="Draft history"]').screenshot(path=str(shots/f'history-{width}.png'))
        (shots/f'history-{width}.aria.txt').write_text(page.locator('.draft-editor').aria_snapshot(),encoding='utf-8')
        action('verify-draft');page.locator('[data-action="export-draft"]:enabled').wait_for()
        with page.expect_download() as dl:action('export-draft')
        revised=json.loads(Path(dl.value.path()).read_text())['puzzles'][0]
        check(seedless(revised)==seedless(draft['puzzles'][0]),f'{width}px: reverified Undo exports the exact original draft')
        page.locator('[data-action="redo-draft"]').focus();page.keyboard.press('Enter')
        check(page.locator('.draft-clue').count()==len(revised['clues'])-1 and page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: keyboard Redo restores the edit and revokes publication')
        page.locator('#clue-who').select_option(removed['who'])
        page.locator('#clue-kind').select_option(removed['kind'])
        page.locator('#clue-value').select_option(str(removed['value']))
        page.locator('#clue-form button[type=submit]').click()
        check(page.locator('[data-action="redo-draft"]').is_disabled(),f'{width}px: new clue edit discards Redo')
    # A routed standalone document gives disposable real IndexedDB without a server or real saves.
    for width in (390,1440):
        history_context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True,reduced_motion='reduce')
        history_context.route('https://scene-history.invalid/**',lambda request: request.fulfill(content_type='text/html',body=(ROOT/'alibi-deluxe-play.html').read_text()))
        history_page=history_context.new_page();history_page.on('pageerror',lambda e: errors.append(str(e)))
        history_page.goto('https://scene-history.invalid/#/workshop');history_page.wait_for_function('window.AlibiDiagnostics')
        history_page.locator('#draft-seed').fill('7');history_page.locator('#scene-form button[type=submit]').click()
        history_page.locator('[data-action="export-draft"]:enabled').wait_for(timeout=30000)
        with history_page.expect_download() as dl:history_page.locator('[data-action="export-draft"]').click()
        original=json.loads(Path(dl.value.path()).read_text())['puzzles'][0]
        # Audit by keyboard. Seed 7 needs every clue; adding the true clue "Miles in row 2" frees clues 3 and 6 and itself (computed by tests/scene-audit.test.cjs).
        count=len(original['clues']);audit=history_page.locator('#draft-audit');audit_button=history_page.locator('[data-action="audit-draft"]')
        check(audit_button.is_enabled(),f'{width}px: a verified draft can be audited')
        audit_button.focus();history_page.keyboard.press('Enter');audit.wait_for()
        check(history_page.evaluate('document.activeElement.id')=='draft-audit',f'{width}px: keyboard audit focuses the result')
        check('Every clue is needed' in audit.inner_text() and audit.locator('[data-action="focus-draft-clue"]').count()==0,f'{width}px: seed 7 audit finds every clue needed')
        history_page.locator('#clue-who').select_option('person-2');history_page.locator('#clue-kind').select_option('row');history_page.locator('#clue-value').select_option('1')
        history_page.locator('#clue-form button[type=submit]').click()
        check(audit.count()==0 and audit_button.is_disabled(),f'{width}px: an edit clears the audit and disables the button')
        history_page.locator('[data-action="verify-draft"]').click();history_page.locator('[data-action="export-draft"]:enabled').wait_for(timeout=30000)
        audit_button.focus();history_page.keyboard.press('Enter');audit.wait_for()
        expected_redundant=[2,5,count]
        check(audit.locator('[data-action="focus-draft-clue"]').all_text_contents()==[f'Clue {i+1}' for i in expected_redundant],f'{width}px: audit names exactly the removable clues')
        check(not history_page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),f'{width}px: audit has no horizontal overflow')
        for position,index in enumerate(expected_redundant):
            audit.locator('[data-action="focus-draft-clue"]').nth(position).focus();history_page.keyboard.press('Enter')
            check(history_page.evaluate('[document.activeElement.dataset.action,document.activeElement.dataset.index].join(":")')==f'remove-draft-clue:{index}',f'{width}px: audit link focuses clue {index+1} control')
        check(history_page.locator('.draft-clue').count()==count+1,f'{width}px: the audit never removes a clue')
        history_page.locator('[data-action="undo-draft"]').focus();history_page.keyboard.press('Enter')
        check(audit.count()==0 and history_page.locator('.draft-clue').count()==count,f'{width}px: Undo clears the audit')
        # Contradict June's row clue, read the numbered diagnosis, follow it by keyboard, Undo, reverify, export, Redo.
        total=len(original['clues']);june=next(i for i,c in enumerate(original['clues']) if c['who']=='person-1' and c['kind']=='row')
        history_page.locator('#clue-who').select_option('person-1');history_page.locator('#clue-kind').select_option('row');history_page.locator('#clue-value').select_option('1')
        history_page.locator('#clue-form button[type=submit]').click()
        check(history_page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: adding a contradiction revokes publication')
        history_page.locator('[data-action="verify-draft"]').focus();history_page.keyboard.press('Enter')
        conflict=history_page.locator('#draft-conflict');conflict.wait_for()
        check(history_page.evaluate('document.activeElement.id')=='draft-conflict',f'{width}px: keyboard verification focuses the conflict')
        check(conflict.locator('[data-action="focus-draft-clue"]').all_text_contents()==[f'Clue {june+1}',f'Clue {total+1}'],f'{width}px: conflict names exactly the two numbered clues')
        check(history_page.locator('[data-action="add-draft"]').is_disabled() and history_page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: conflicting drafts cannot play or export')
        check(not history_page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),f'{width}px: conflict has no horizontal overflow')
        for index in (june,total):
            history_page.locator('#draft-conflict [data-action="focus-draft-clue"]').nth(0 if index==june else 1).focus();history_page.keyboard.press('Enter')
            check(history_page.evaluate('[document.activeElement.dataset.action,document.activeElement.dataset.index].join(":")')==f'remove-draft-clue:{index}',f'{width}px: conflict link focuses clue {index+1} control')
        history_page.locator('[data-action="undo-draft"]').focus();history_page.keyboard.press('Enter')
        check(history_page.locator('#draft-conflict').count()==0 and history_page.locator('.draft-clue').count()==total,f'{width}px: Undo removes the contradiction and its diagnosis')
        history_page.locator('[data-action="verify-draft"]').click();history_page.locator('[data-action="export-draft"]:enabled').wait_for(timeout=30000)
        with history_page.expect_download() as dl:history_page.locator('[data-action="export-draft"]').click()
        check(json.loads(Path(dl.value.path()).read_text())['puzzles'][0]==original,f'{width}px: reverified Undo exports the exact pre-contradiction draft')
        history_page.locator('[data-action="redo-draft"]').focus();history_page.keyboard.press('Enter')
        check(history_page.locator('.draft-clue').count()==total+1 and history_page.locator('#draft-conflict').count()==0 and history_page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: Redo restores the contradiction without a stale diagnosis or publication')
        history_page.locator('[data-action="undo-draft"]').focus();history_page.keyboard.press('Enter')
        check(history_page.locator('.draft-clue').count()==total,f'{width}px: the journey ends on the original clues')
        history_page.locator('#room-name-0').fill('Restored room');history_page.locator('#room-name-0').blur()
        history_page.locator('#room-name-0').fill('Temporary experiment');history_page.locator('#room-name-0').blur()
        history_page.locator('[data-action="undo-draft"]').focus();history_page.keyboard.press('Enter')
        expected={**original,'roomNames':['Restored room',*original['roomNames'][1:]]}
        saved=history_page.evaluate("""() => new Promise((resolve,reject) => {
          const request=indexedDB.open('alibi-device',1);
          request.onerror=()=>reject(request.error);
          request.onsuccess=()=>{ const db=request.result, read=db.transaction('meta').objectStore('meta').get('workshop-draft');
            read.onsuccess=()=>{resolve(read.result.value);db.close();}; read.onerror=()=>{reject(read.error);db.close();}; };
        })""")
        check(saved=={'puzzle':expected},f'{width}px: Undo persists exact current content with no history fields')
        history_page.reload();history_page.locator('.draft-editor').wait_for()
        check(history_page.locator('#room-name-0').input_value()=='Restored room',f'{width}px: reload retains restored room content')
        check(history_page.locator('[data-action="undo-draft"]').is_disabled() and history_page.locator('[data-action="redo-draft"]').is_disabled(),f'{width}px: reload starts with empty memory history')
        check(history_page.locator('[data-action="export-draft"]').is_disabled(),f'{width}px: reload requires verification')
        history_page.locator('[data-action="verify-draft"]').click();history_page.locator('[data-action="export-draft"]:enabled').wait_for()
        with history_page.expect_download() as dl:history_page.locator('[data-action="export-draft"]').click()
        check(json.loads(Path(dl.value.path()).read_text())['puzzles'][0]==expected,f'{width}px: reload and reverify export exact restored draft')
        history_context.close()
    page.set_viewport_size({'width':1440,'height':1000})
    page.locator('#room-name-0').fill('Garden room');page.locator('#room-name-0').blur()
    check(page.locator('[data-action="add-draft"]').is_disabled(),'Editing invalidates verification')
    action('verify-draft');page.locator('[data-action="add-draft"]:enabled').wait_for(timeout=30000)
    check('Verified:' in page.locator('#draft-verification').inner_text(),'Edited scene can be reverified')
    # Rehearse (#828): the verified draft plays in memory. No IndexedDB write, no pack, no run, draft intact.
    clue_buttons='.draft-editor [data-action="remove-draft-clue"]'
    title_before=page.locator('#draft-title').input_value();clues_before=page.locator(clue_buttons).count()
    counts_before=page.evaluate('AlibiDiagnostics.getCounts()')
    page.evaluate("""()=>{window.__idbWrites=0;for(const [c,names] of [[IDBObjectStore,['put','add','delete','clear']],[IDBCursor,['update','delete']]])for(const n of names){const f=c.prototype[n];c.prototype[n]=function(...a){window.__idbWrites++;return f.apply(this,a)}}}""")
    page.locator('[data-action="rehearse-draft"]:enabled').focus();page.keyboard.press('Enter')
    page.wait_for_function('AlibiDiagnostics.getCurrent()?.rehearsal===true')
    banner=page.locator('.practice-return');banner.wait_for()
    check('Rehearsal · nothing is saved' in banner.inner_text(),'Rehearsal shows its unsaved banner')
    rehearsed=state()['puzzle'];person=rehearsed['people'][0]['id']
    action('person',f'[data-id="{person}"]');cell(rehearsed['solution'][person])
    check(len(state()['state']['placements'])==1,'A rehearsal accepts moves')
    page.wait_for_timeout(400)
    page.locator('.practice-return [data-action="back-to-collection"]').click()
    page.locator('.draft-editor').wait_for()
    check(page.evaluate('window.__idbWrites')==0,'Rehearsal made zero IndexedDB writes')
    check(page.evaluate('AlibiDiagnostics.getCounts()')==counts_before,'Rehearsal added no pack, run or puzzle')
    check(page.evaluate('AlibiDiagnostics.getCurrent()') is None,'Returning drops the rehearsal board')
    check(page.locator('#draft-title').input_value()==title_before and page.locator(clue_buttons).count()==clues_before,'The draft returns unchanged')
    page.locator('[data-action="add-draft"]:enabled').wait_for(timeout=30000)
    page.screenshot(path=str(shots/'desktop-workshop.png'),full_page=True)
    action('add-draft');page.wait_for_function('AlibiDiagnostics.getCounts().customPacks===1')
    check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==OFFICIAL_COUNT+1,'Verified custom scene installs locally')
    # Invalid pack is rejected without any mutation.
    page.locator('#pack-input').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"schemaVersion":99}'})
    page.wait_for_timeout(300);check(page.evaluate('AlibiDiagnostics.getCounts().puzzles')==OFFICIAL_COUNT+1,'Bad pack cannot modify catalogue')
    route('settings')
    with page.expect_download() as dl:action('export')
    backup=json.loads(Path(dl.value.path()).read_text());check(backup['format']=='alibi-backup' and len(backup['runs'])>=12,'Backup exports actual played states')
    check(len(backup['packs'])==1,'Backup includes custom pack')
    # Exercise a real worker response that outlasts the former 150 ms sleep.
    page.evaluate("""() => {
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
            constructor(...args) { super(...args); window.Worker = NativeWorker; }
            set onmessage(handler) {
                super.onmessage = event => setTimeout(() => handler(event), 500);
            }
        };
    }""")
    page.locator('#backup-input').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
    expect(page.locator('[data-action="restore-merge"]')).to_have_count(1)
    check(page.locator('[data-action="restore-merge"]').count()==1,'Exported backup validates on import')
    dismiss()
    # Existing runs retain their definition when the live catalogue revision changes.
    route('play/sudoku-02@1');dismiss();old_state=state()['state'];old_title=state()['puzzle']['title']
    page.evaluate("(()=>{const p=ALIBI_CATALOG.puzzles.find(p=>p.id==='sudoku-02');p.revision=2;p.title='Revision two test';})()")
    route('home');route('play/sudoku-02@1');dismiss()
    check(state()['puzzle']['title']==old_title and state()['state']==old_state,'Saved run keeps original definition after catalogue revision changes')
    route('play/sudoku-02@2');dismiss();check(state()['puzzle']['title']=='Revision two test' and state()['moves']==0,'New revision creates separate run')
    # Revert this test-only catalogue mutation before any further exports.
    page.evaluate('(title)=>{const p=ALIBI_CATALOG.puzzles.find(p=>p.id==="sudoku-02");p.revision=1;p.title=title;}',old_title)
    check(page.evaluate('failedVibrationAttempts') > 0,'Actual game controls complete and export saved moves despite failed vibration')
    check(not errors,'No uncaught browser exceptions')
    (ROOT/'tests/browser-results.json').write_text(json.dumps({'passed':True,'assertions':len(checks),'checks':checks,'errors':errors,'browser':browser.version,'build':page.evaluate('ALIBI_CONFIG.build'),'scope':'Chromium isolated page via set_content; real DOM, controls, Blob workers and downloads; not hosted navigation, IndexedDB persistence, real service worker or Android.'},indent=2))
    browser.close()
print('PASS',len(checks),'browser checks')
