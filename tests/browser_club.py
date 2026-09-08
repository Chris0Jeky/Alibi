"""Actual Chromium controls in an isolated document. No hosted/Android claim."""
from pathlib import Path
import json,os,time
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1];checks=[];errors=[];shots=r/'test-results'/'afterhours-club';shots.mkdir(parents=True,exist_ok=True)
def check(v,label):
 assert v,label
 checks.append(label);print('PASS',label,flush=True)
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox']}
 if os.environ.get('CHROMIUM_PATH'):launch['executable_path']=os.environ['CHROMIUM_PATH']
 elif Path('/usr/bin/chromium').exists():launch['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**launch);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='no-preference');page=ctx.new_page();page.set_default_timeout(7000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.set_content((r/'alibi-deluxe-play.html').read_text(encoding='utf-8'),wait_until='load');page.wait_for_function('globalThis.AlibiDiagnostics')
 def action(a,extra=''):page.locator('[data-action="'+a+'"]'+extra+':visible').first.click()
 def dismiss():
  if page.locator('dialog[open]').count():
   if page.locator('dialog[open] [data-action="lesson-finish"]').count():action('lesson-finish')
   else:action('close-dialog')
 def route(path):
  dismiss();page.evaluate('(s)=>location.hash=s',path);page.wait_for_timeout(180);dismiss()
 def diag():return page.evaluate('AlibiClub.diagnostics()')
 def log(id):return diag()['state']['runs'][id]['log']
 def shot(name):page.evaluate('document.activeElement?.blur();window.scrollTo(0,0)');page.screenshot(path=str(shots/(name+'.png')),full_page=True)
 check(not diag()['engineLoaded'],'New game engines are not executed on home')
 shot('home-desktop');h=diag()['hero'];action('club-rotate');check(diag()['hero']==(h+1)%4,'Manual edition switch changes the front page');action('club-pin');check(diag()['pinned']==diag()['hero'],'Pinning records the chosen edition');route('/library');route('/home');check(diag()['hero']==(h+1)%4,'Edition does not rotate during navigation');action('club-pin');action('club-rotate');action('club-rotate');action('club-rotate')
 route('/salon/duel');check(diag()['engineLoaded'],'Games room loads its engine on demand');check(page.locator('.duel-cell.legal').count()==4,'Duel advertises four legal opening moves');page.locator('.duel-cell.legal').first.click();page.wait_for_function('AlibiClub.diagnostics().state.runs.duel.log.length===2');check(not diag()['botPending'],'Offline worker opponent replies');action('club-undo','[data-id="duel"]');check(len(log('duel'))==0,'Undo against keeper rewinds the whole exchange');action('club-redo','[data-id="duel"]');check(len(log('duel'))==2,'Redo restores both turns')
 action('club-duel-mode','[data-value="local"]');action('club-reset-confirm');check(diag()['state']['runs']['duel']['mode']=='local','Switch to actual same-device two-player mode')
 for k in range(40):
  legal=page.locator('.duel-cell.legal:not([disabled])')
  if not legal.count():break
  legal.first.click()
  if k==9:shot('duel-desktop')
 check('Final score' in page.locator('.club-turn-status').inner_text(),'Two players reach a complete duel result');check(any(x['type']=='duel' for x in diag()['state']['records']),'Completed duel recorded without fake rivals')
 route('/salon/borough');check(page.locator('.plan strong').all_text_contents().__len__()==3,'Town draft exposes three plans');check(len(set(page.locator('.plan strong').all_text_contents()))==3,'Opening plans are distinct choices');action('club-plan','[data-value="1"]');page.locator('.borough-cell:not(.built)').first.click();check(len(log('borough'))==0,'Previewing a plot does not commit');check('points' in page.locator('[data-action="club-build"]').inner_text(),'Placement preview shows the score change');action('club-build');check(len(log('borough'))==1,'Explicit confirmation builds one tile');action('club-undo','[data-id="borough"]');check(len(log('borough'))==0,'Town undo restores draft and board');action('club-redo','[data-id="borough"]');check(len(log('borough'))==1,'Town redo restores the build')
 for k in range(17):
  action('club-plan',f'[data-value="{k%3}"]');page.locator('.borough-cell:not(.built)').first.click();action('club-build')
  if k==10:shot('borough-desktop')
 check(page.locator('.town-finished').count()==1,'Eighteen placements complete the town');check(any(x['type']=='borough' for x in diag()['state']['records']),'Town result enters the personal records');route('/club');check(page.locator('.record-table>div').count()==1,'Local leaderboard contains the actual town result');check('THIS BROWSER ONLY' in page.locator('.local-label').inner_text(),'Leaderboard scope is visible');shot('journal-desktop')
 route('/home');action('club-daily');page.wait_for_timeout(200);page.locator('.borough-cell:not(.built)').first.click();action('club-build');before=log('borough');route('/home');check(page.locator('.club-letter.has-run').count()==1,'Home offers to continue the latest unfinished game');action('club-daily');page.wait_for_timeout(180);check(log('borough')==before,'Opening today’s town again does not erase it')
 route('/salon/archive');paths=['RRULL','RUDLLU','RUU','UUDRDRUULUL','RRRUUDLLDLUU','UUDDLUDLUURRRDRU'];directions={'R':'right','U':'up','D':'down','L':'left'}
 for level,path in enumerate(paths):
  if level:action('club-archive-level',f'[data-value="{level}"]')
  for ch in path:action('club-walk',f'[data-value="{directions[ch]}"]')
  check('Every record in its place' in page.locator('.archive-status').inner_text(),'Archive room '+str(level+1)+' solved through movement controls')
  if level==3:shot('archive-desktop')
 action('club-undo','[data-id="archive"]');check('Every record' not in page.locator('.archive-status').inner_text(),'Undo can reopen a completed spatial room');action('club-redo','[data-id="archive"]');check('Every record' in page.locator('.archive-status').inner_text(),'Redo restores spatial completion')
 route('/play/dossier-02');action('club-assist','[data-value="tidy"]');action('mark','[data-cell="0"]');check(page.locator('.logic-cell.derived-mark').count()>0,'YES projects visible automatic exclusions');initial=page.evaluate('AlibiDiagnostics.getCurrent().state.marks');check(initial.count(0)==0,'Automatic exclusions are not persisted as manual crosses');action('undo');check(page.locator('.logic-cell.derived-mark').count()==0,'Undo removes automatic exclusions');action('redo');check(page.locator('.logic-cell.derived-mark').count()>0,'Redo recomputes automatic exclusions');shot('dossier-desktop')
 route('/play/sudoku-01');action('club-forced');check('One forced step' in page.locator('dialog').inner_text(),'Forced step is explained before application');prior=page.evaluate('AlibiDiagnostics.getCurrent().state');action('club-forced-apply');check(page.evaluate('AlibiDiagnostics.getCurrent().state')!=prior,'Confirmed deduction changes the board');action('undo');check(page.evaluate('AlibiDiagnostics.getCurrent().state')==prior,'Forced step is one undoable action');shot('assisted-sudoku-desktop')
 route('/lab');page.wait_for_timeout(1800);check('WORKER' in page.locator('#lab-engine').inner_text(),'Harbour uses OffscreenCanvas worker');check('fps' in page.locator('#lab-fps').inner_text(),'Graphics display actual measured counters');shot('atlas-desktop');action('club-lab-toggle');page.wait_for_timeout(100);check(page.locator('#lab-fps').inner_text()=='0 fps','Pausing stops graphics rendering');action('club-lab-toggle');action('club-lab-quality','[data-value="60"]');check(page.locator('[data-action="club-lab-quality"][data-value="60"]').get_attribute('class').endswith('active'),'Quality budget is interactive');route('/home');check(not diag()['labActive'],'Leaving the scene disposes the renderer')
 # Force the documented main-thread fallback in this test document.
 page.evaluate('HTMLCanvasElement.prototype.transferControlToOffscreen=undefined');route('/lab');page.wait_for_timeout(1400);check('FALLBACK' in page.locator('#lab-engine').inner_text(),'Canvas fallback runs without OffscreenCanvas');check('fps' in page.locator('#lab-fps').inner_text(),'Fallback also reports real counters')
 page.emulate_media(reduced_motion='reduce');route('/home');route('/lab');check(page.locator('#lab-pause').inner_text()=='Resume harbour','Reduced motion starts the scene paused');page.emulate_media(reduced_motion='no-preference')
 # Zen is an explicit display mode, not a reset or another scoring mode.
 route('/salon/borough');before=log('borough');action('club-zen');check(page.locator('body').get_attribute('class').find('club-zen')>=0,'Zen mode activates');check(not page.locator('.sidebar').is_visible(),'Zen removes main navigation');check(page.locator('[data-action="club-undo"]').first.is_visible(),'Zen keeps essential controls');check(log('borough')==before,'Zen does not change the game');shot('zen-desktop');page.keyboard.press('Escape');check(not diag()['state']['settings']['zen'],'Escape exits Zen')
 # All rendered routes on four device widths, closing onboarding before inspection.
 paths=['/home','/salon','/salon/duel','/salon/borough','/salon/archive','/lab','/club','/play/scene-02','/play/sudoku-01','/play/dossier-02','/play/bridges-01']
 for width in [360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844 if width<768 else 1000})
  for path in paths:
   route(path);check(not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),f'No horizontal overflow: {width}px {path}')
   if width==390:
    name={'/home':'home-mobile','/salon':'games-mobile','/salon/duel':'duel-mobile','/salon/borough':'borough-mobile','/salon/archive':'archive-mobile','/lab':'atlas-mobile','/club':'journal-mobile','/play/scene-02':'scene-mobile','/play/sudoku-01':'assisted-sudoku-mobile','/play/dossier-02':'dossier-mobile','/play/bridges-01':'bridges-mobile'}[path];shot(name)
  if width==390:
   route('/play/scene-02');action('club-zen');check(page.locator('.main-tools [data-action="undo"]').is_visible(),'Zen retains puzzle undo on mobile');check(page.locator('.evidence-column').is_visible(),'Zen retains puzzle evidence on mobile');shot('zen-mobile');action('club-zen')
 route('/club')
 with page.expect_download() as d:action('club-export')
 exported=json.loads(Path(d.value.path()).read_text());check(exported['schema']==1 and len(exported['records'])>=8,'Club backup contains played games and records');check('token' not in json.dumps(exported),'Private-room credentials are excluded from backup')
 page.locator('#club-import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"schema":99}' });page.wait_for_timeout(100);check(not page.locator('dialog[open]').count(),'Unsupported imported save is rejected before confirmation')
 page.locator('#club-import').set_input_files({'name':'good.json','mimeType':'application/json','buffer':json.dumps(exported).encode()});page.wait_for_timeout(150);check(page.locator('dialog[open]').count()==1,'Valid restore requires confirmation');action('close-dialog')
 action('club-online-settings');check('optional room server' in page.locator('dialog').inner_text(),'Online UI explains separate backend requirement');action('club-room-create');check('Deploy the optional room server' in page.locator('body').inner_text(),'Unconfigured online action gives an actionable error');dismiss()
 check(not errors,'No unhandled browser page errors')
 (r/'tests/browser-club-results.json').write_text(json.dumps({'passed':True,'assertions':len(checks),'scope':'Real Chromium DOM, Blob workers and controls in an isolated document. No browser-origin storage, Android installation or Cloudflare runtime claims.','checks':checks,'errors':errors},indent=2));browser.close()
