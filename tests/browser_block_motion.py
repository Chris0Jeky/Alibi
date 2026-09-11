"""Actual-control integration checks; use npm run build and npm start first."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from block_touch_cases import assert_touch_drag

URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
OUT = Path('test-results/block-motion')
OUT.mkdir(parents=True, exist_ok=True)
checks = []


def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)


def current(page):
    return page.evaluate('AlibiClub.diagnostics().state.runs.blockcabinet')


def boot(page):
    page.goto(URL + '/#/salon/blockcabinet')
    page.locator('.bc-host .bc-cell').first.wait_for(timeout=20000)


def move(page, prefix='.bc-host'):
    page.locator(prefix + ' [data-piece="0"]').focus()
    page.keyboard.press('Enter')
    cell = page.locator(prefix + ' .bc-cell.legal').first
    cell.focus()
    page.keyboard.press('Enter')
    page.wait_for_timeout(1900)


def lab(page):
    menu = page.locator('.bc-host [data-command="menu"]')
    if menu.is_visible() and menu.get_attribute('aria-expanded') != 'true':
        menu.click()
    page.locator('.bc-host [data-command="switch"]').click()
    page.locator('.bc-modal .bc-cell').first.wait_for()


with sync_playwright() as p:
    args = {'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('CHROMIUM_PATH'):
        args['executable_path'] = os.environ['CHROMIUM_PATH']
    elif Path('/usr/bin/chromium').exists():
        args['executable_path'] = '/usr/bin/chromium'
    browser = p.chromium.launch(**args)
    for width in (390, 1280):
        context = browser.new_context(viewport={'width': width, 'height': 1000}, has_touch=True)
        page = context.new_page()
        page.set_default_timeout(10000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        boot(page)
        before = current(page)
        move(page)
        after = current(page)
        check(len(after['log']) == len(before['log']) + 1, f'{width}: keyboard commits legacy replay')
        expected = page.evaluate('AlibiClubEngines.blockCabinet.replay(AlibiClub.diagnostics().state.runs.blockcabinet.seed, AlibiClub.diagnostics().state.runs.blockcabinet.log).score')
        check(int(page.locator('.bc-host [data-score]').inner_text()) == expected, f'{width}: score equals legacy reducer')
        check(page.locator('.bc-host .bc-cell:focus').count() == 1, f'{width}: board keyboard focus restored')
        page.locator('.bc-host [data-command="undo"]').focus()
        page.keyboard.press('Enter')
        page.wait_for_function('(n)=>AlibiClub.diagnostics().state.runs.blockcabinet.log.length===n', arg=len(before['log']))
        page.wait_for_function('()=>!AlibiBlockMotion.diagnostics().pending')
        check(current(page)['log'] == before['log'], f'{width}: legacy undo')
        check(page.locator('.bc-host [data-command="redo"]:focus').count() == 1, f'{width}: undo restores focus to the available command')
        page.locator('.bc-host [data-command="redo"]').focus()
        page.keyboard.press('Enter')
        page.wait_for_function('(n)=>AlibiClub.diagnostics().state.runs.blockcabinet.log.length===n', arg=len(after['log']))
        page.wait_for_function('()=>!AlibiBlockMotion.diagnostics().pending')
        check(current(page)['log'] == after['log'], f'{width}: legacy redo')
        check(page.locator('.bc-host [data-command="undo"]:focus').count() == 1, f'{width}: redo restores focus to the available command')
        page.locator('.bc-host .bc-board').scroll_into_view_if_needed()
        geometry = page.evaluate('''() => {
          const r=AlibiClub.diagnostics().state.runs.blockcabinet,e=AlibiClubEngines.blockCabinet,s=e.replay(r.seed,r.log);
          const slot=[0,1,2].find(n=>e.placements(s,n).length),origin=e.placements(s,slot)[0],shape=e.shape(s.tray[slot]);
          const b=document.querySelector('.bc-host .bc-board').getBoundingClientRect(),t=document.querySelector('.bc-host [data-piece="'+slot+'"]').getBoundingClientRect(),cell=b.width/8;
          return {sx:t.x+t.width/2,sy:t.y+t.height/2,x:b.x+(origin%8+(Math.max(...shape.cells.map(c=>c[0]))+1)/2)*cell,y:b.y+(Math.floor(origin/8)+(Math.max(...shape.cells.map(c=>c[1]))+1)/2)*cell};
        }''')
        n = len(current(page)['log'])
        page.mouse.move(geometry['sx'], geometry['sy']); page.mouse.down()
        page.mouse.move(geometry['x'], geometry['y'], steps=8); page.mouse.up()
        page.wait_for_timeout(1900)
        check(len(current(page)['log']) == n+1, f'{width}: mouse drag commits exactly once')
        assert_touch_drag(page, context, check, width)
        tray = page.locator('.bc-host [data-piece="0"]').bounding_box()
        cdp = context.new_cdp_session(page)
        n = len(current(page)['log'])
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':tray['x']+tray['width']/2,'y':tray['y']+tray['height']/2}]})
        cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':geometry['x'],'y':geometry['y']}]})
        cdp.send('Input.dispatchTouchEvent', {'type':'touchCancel','touchPoints':[]})
        check(len(current(page)['log']) == n, f'{width}: cancelled touch cannot place')
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}: no horizontal overflow')
        saved = current(page)['log']
        page.reload(); page.locator('.bc-host .bc-cell').first.wait_for()
        check(current(page)['log'] == saved, f'{width}: Classic survives reload')
        lab(page)
        move(page, '.bc-modal')
        score = page.locator('.bc-modal [data-score]').inner_text()
        check(int(score) > 0, f'{width}: Cascade actual controls')
        check(current(page)['log'] == saved, f'{width}: Cascade cannot mutate Classic')
        race_replay = json.dumps({'rules': 'cascade-cabinet-1', 'seed': 'RACE', 'log': [], 'redo': []})
        menu = page.locator('.bc-modal [data-command="menu"]')
        if menu.is_visible() and menu.get_attribute('aria-expanded') != 'true':
            menu.click()
        page.once('dialog', lambda dialog: dialog.accept())
        with page.expect_file_chooser() as chooser_info:
            page.locator('.bc-modal [data-command="import"]').click()
        page.evaluate('''async()=>await new Promise((resolve,reject)=>{
          const request=indexedDB.deleteDatabase('alibi-block-studio');
          request.onsuccess=resolve;
          request.onerror=()=>reject(request.error);
          request.onblocked=()=>reject(new Error('Replay database deletion stayed blocked.'));
        })''')
        chooser_info.value.set_files(
            {'name': 'cascade-race.json', 'mimeType': 'application/json', 'buffer': race_replay.encode()}
        )
        page.wait_for_function("() => document.querySelector('.bc-modal .bc-status').textContent.includes('protected')")
        check(page.locator('.bc-modal [data-score]').inner_text() == score, f'{width}: protected import race keeps the current replay')
        page.locator('.bc-modal-close').click()
        lab(page)
        menu = page.locator('.bc-modal [data-command="menu"]')
        if menu.is_visible() and menu.get_attribute('aria-expanded') != 'true':
            menu.click()
        replay = json.dumps({'rules': 'cascade-cabinet-1', 'seed': 'IMPORTED', 'log': [], 'redo': []})
        page.once('dialog', lambda dialog: dialog.accept())
        with page.expect_file_chooser() as chooser_info:
            page.locator('.bc-modal [data-command="import"]').click()
        chooser_info.value.set_files(
            {'name': 'cascade.json', 'mimeType': 'application/json', 'buffer': replay.encode()}
        )
        page.wait_for_function("() => document.querySelector('.bc-modal [data-score]').textContent.trim() === '0'")
        check(page.locator('.bc-modal [data-score]').inner_text() == '0', f'{width}: Cascade import uses the emitted worker')
        score = '0'
        page.screenshot(path=str(OUT / f'cascade-{width}.png'), full_page=True)
        page.locator('.bc-modal-close').click()
        lab(page)
        check(page.locator('.bc-modal [data-score]').inner_text() == score, f'{width}: Cascade persists on reopen')
        page.locator('.bc-modal-close').click()
        if page.locator('.bc-host [data-command="menu"]').is_visible():
            if page.locator('.bc-host [data-command="menu"]').get_attribute('aria-expanded') != 'true':
                page.locator('.bc-host [data-command="menu"]').click()
        page.locator('.bc-host [data-command="simple"]').click()
        check(page.locator('.block-grid').is_visible(), f'{width}: simple controls remain playable')
        page.locator('.bc-enable').click()
        page.locator('.bc-host .bc-cell').first.wait_for()
        check(current(page)['log'] == saved, f'{width}: switching controls preserves replay')
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate('location.hash="#/settings"')
        setting = page.locator('#setting-reducedMotion')
        setting.wait_for()
        if not setting.is_checked():
            setting.check()
        page.evaluate('location.hash="#/salon/blockcabinet"')
        page.locator('.bc-host .bc-cell').first.wait_for()
        check(page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: app reduced-motion setting respected')
        lab(page)
        check(page.evaluate('AlibiBlockMotion.diagnostics().labReducedMotion'), f'{width}: Cascade app reduced-motion setting respected')
        page.locator('.bc-modal-close').click()
        page.evaluate('location.hash="#/settings"')
        setting = page.locator('#setting-reducedMotion')
        setting.wait_for()
        if setting.is_checked():
            setting.uncheck()
        page.evaluate('location.hash="#/salon/blockcabinet"')
        page.locator('.bc-host .bc-cell').first.wait_for()
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function('()=>AlibiBlockMotion.diagnostics().reducedMotion')
        check(page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: reduced motion respected')
        page.screenshot(path=str(OUT / f'classic-{width}.png'), full_page=True)
        page.wait_for_function('''async()=>{
          if(!navigator.serviceWorker.controller)return false;
          const c=ALIBI_BLOCK_MOTION,pack=await caches.open('alibi-block-motion-'+c.build);
          return (await Promise.all(c.files.map(url=>pack.match(url)))).every(Boolean);
        }''')
        context.set_offline(True)
        page.reload(); page.locator('.bc-host .bc-cell').first.wait_for(timeout=20000)
        check(current(page)['log'] == saved, f'{width}: optional surface and Classic reload offline')
        context.set_offline(False)
        page.evaluate('location.hash="#/salon"')
        page.wait_for_timeout(200)
        check(not page.evaluate('AlibiBlockMotion.diagnostics().active'), f'{width}: route exit disposes surface')
        check(not errors, f'{width}: no uncaught browser errors: {errors}')
        context.close()
    context = browser.new_context(viewport={'width':1280,'height':1000})
    a=context.new_page(); b=context.new_page()
    boot(a); lab(a); boot(b); lab(b)
    move(a,'.bc-modal'); move(b,'.bc-modal')
    check('Another tab' in b.locator('.bc-modal .bc-status').inner_text(), 'Cascade stale-tab write is rejected')
    check(b.locator('.bc-modal [data-score]').inner_text() == '0', 'Rejected stale write does not mutate game')
    context.close(); browser.close()

(OUT/'acceptance.json').write_text(json.dumps({'checks':len(checks),'passed':checks,'physicalAndroidTested':False},indent=2))
print(f'Block motion: {len(checks)} checks passed; no physical Android claim.')
