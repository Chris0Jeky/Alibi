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
    piece = page.locator(prefix + ' [data-piece="0"]')
    piece.focus()
    page.keyboard.press('Enter')
    page.wait_for_function(
        '(selector) => document.querySelector(selector)?.getAttribute("aria-pressed") === "true"',
        arg=prefix + ' [data-piece="0"]',
    )
    cell = page.locator(prefix + ' .bc-cell.legal').first
    cell.focus()
    page.keyboard.press('Enter')
    page.wait_for_timeout(1900)


def lab(page, check_name=False):
    menu = page.locator('.bc-host [data-command="menu"]')
    if menu.is_visible() and menu.get_attribute('aria-expanded') != 'true':
        menu.click()
    page.locator('.bc-host [data-command="switch"]').click()
    page.locator('.bc-modal .bc-cell').first.wait_for()
    if check_name:
        check(
            page.locator('.bc-modal').get_attribute('aria-labelledby') == 'cascade-cabinet-title'
            and page.locator('#cascade-cabinet-title').inner_text().strip().startswith('Cascade Cabinet'),
            'Cascade dialog has an accessible name',
        )
        check(
            page.get_by_role('button', name='Start a new Cascade seed', exact=True).is_visible(),
            'Cascade restart names its new-seed action',
        )


def watch_host(page):
    page.evaluate('''() => {
      const host = document.querySelector('.bc-host');
      const watch = window.__bcHostContinuity = {
        host,
        detached: false,
        removalDetails: [],
        zeroGeometry: false,
        visibleEffectDraws: 0,
        invisibleEffectDraws: 0,
        frames: 0,
        stopped: false,
      };
      const proto = CanvasRenderingContext2D.prototype;
      watch.fillTextDescriptor = Object.getOwnPropertyDescriptor(proto, 'fillText');
      Object.defineProperty(proto, 'fillText', {
        ...watch.fillTextDescriptor,
        value: function(...args) {
          if (typeof args[0] === 'string' && /^[+][0-9]+$/.test(args[0])) {
            const canvas = this.canvas, rect = canvas?.getBoundingClientRect();
            if (canvas?.isConnected && canvas.closest('.bc-host') === watch.host &&
                rect?.width > 0 && rect?.height > 0) watch.visibleEffectDraws += 1;
            else watch.invisibleEffectDraws += 1;
          }
          return watch.fillTextDescriptor.value.apply(this, args);
        },
      });
      watch.observer = new MutationObserver(records => {
        for (const record of records)
          for (const removed of record.removedNodes)
            if (removed === watch.host || removed.contains?.(watch.host)) {
              watch.detached = true;
              watch.removalDetails.push(`${removed.nodeName}.${removed.className || ''}`);
            }
      });
      watch.observer.observe(document.documentElement, {childList: true, subtree: true});
      const sample = () => {
        if (!watch || watch.stopped) return;
        const current = document.querySelector('.bc-host');
        const rect = watch.host?.getBoundingClientRect();
        watch.frames += 1;
        if (!watch.host?.isConnected || current !== watch.host) watch.detached = true;
        if (!rect || rect.width === 0 || rect.height === 0) watch.zeroGeometry = true;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }''')


def stop_host_watch(page):
    return page.evaluate('''() => {
      const watch = window.__bcHostContinuity;
      watch.stopped = true;
      for (const record of watch.observer.takeRecords())
        for (const removed of record.removedNodes)
          if (removed === watch.host || removed.contains?.(watch.host)) {
            watch.detached = true;
            watch.removalDetails.push(`${removed.nodeName}.${removed.className || ''}`);
          }
      watch.observer.disconnect();
      const proto = CanvasRenderingContext2D.prototype;
      Object.defineProperty(proto, 'fillText', watch.fillTextDescriptor);
      const rect = watch.host?.getBoundingClientRect();
      return {
        detached: watch.detached,
        removalDetails: watch.removalDetails,
        zeroGeometry: watch.zeroGeometry,
        same: watch.host === document.querySelector('.bc-host'),
        visibleEffectDraws: watch.visibleEffectDraws,
        invisibleEffectDraws: watch.invisibleEffectDraws,
        fillTextRestored: Object.getOwnPropertyDescriptor(proto, 'fillText').value === watch.fillTextDescriptor.value,
        frames: watch.frames,
        finalConnected: !!watch.host?.isConnected,
        finalWidth: rect?.width || 0,
        finalHeight: rect?.height || 0,
      };
    }''')


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
        page.emulate_media(reduced_motion='no-preference')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        boot(page)
        zen = page.locator('[data-action="club-zen"]').first
        if zen.is_visible():
            zen.click()
        else:
            page.evaluate('AlibiClub.action({dataset: {action: "club-zen"}})')
        page.wait_for_function("() => document.body.classList.contains('club-zen')")
        check(page.locator('.bc-host .bc-aside').is_visible() is False, f'{width}: Zen hides the enhanced aside')
        check(page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: Zen enables reduced motion on the retained surface')
        menu = page.locator('.bc-host [data-command="menu"]')
        if menu.is_visible():
            menu.click()
            check(page.locator('.bc-host .bc-aside').is_visible() is False, f'{width}: Zen keeps the enhanced aside hidden from the menu')
        page.evaluate('location.hash="#/salon"')
        page.wait_for_function("() => !document.querySelector('.block-panel')")
        page.evaluate('location.hash="#/salon/blockcabinet"')
        page.locator('.bc-host .bc-cell').first.wait_for()
        check(page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: a surface mounted in Zen uses reduced motion')
        page.locator('#zen-exit').click()
        page.wait_for_function("() => !document.body.classList.contains('club-zen')")
        page.wait_for_function(
            """() => {
              const host = document.querySelector('.bc-host'), d = AlibiBlockMotion.diagnostics();
              return host?.isConnected && host.closest('.block-panel') && !d.scheduled;
            }"""
        )
        check(not page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: exiting Zen restores the device motion preference')
        menu = page.locator('.bc-host [data-command="menu"]')
        if menu.is_visible() and menu.get_attribute('aria-expanded') != 'true':
            menu.click()
        help_panel = page.locator('.bc-host .bc-help')
        help_panel.locator('summary').click()
        motion = help_panel.locator('[data-command="motion"]')
        motion.click()
        check(page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: local reduced-motion toggle enables the floor')
        before = current(page)
        watch_host(page)
        try:
            move(page)
        finally:
            continuity = stop_host_watch(page)
        check(
            not continuity['detached']
            and not continuity['zeroGeometry']
            and continuity['same']
            and continuity['fillTextRestored'],
            f'{width}: reduced-motion tactile host stays mounted with geometry during commit: {continuity}',
        )
        after = current(page)
        check(len(after['log']) == len(before['log']) + 1, f'{width}: keyboard commits legacy replay')
        check(page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: local reduced-motion choice survives the Club rerender')
        expected = page.evaluate('AlibiClubEngines.blockCabinet.replay(AlibiClub.diagnostics().state.runs.blockcabinet.seed, AlibiClub.diagnostics().state.runs.blockcabinet.log).score')
        check(int(page.locator('.bc-host [data-score]').inner_text()) == expected, f'{width}: score equals legacy reducer')
        check(page.locator('.bc-host .bc-cell:focus').count() == 1, f'{width}: board keyboard focus restored')
        motion.click()
        check(not page.evaluate('AlibiBlockMotion.diagnostics().reducedMotion'), f'{width}: local reduced-motion toggle can be cleared')
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
        ordinary_before = current(page)
        watch_host(page)
        try:
            move(page)
        finally:
            ordinary = stop_host_watch(page)
        check(
            not ordinary['detached']
            and not ordinary['zeroGeometry']
            and ordinary['same']
            and ordinary['finalConnected']
            and ordinary['finalWidth'] > 0
            and ordinary['finalHeight'] > 0
            and ordinary['invisibleEffectDraws'] == 0
            and ordinary['fillTextRestored'],
            f'{width}: ordinary-motion placement keeps one tactile host with nonzero geometry: {ordinary}',
        )
        check(ordinary['visibleEffectDraws'] > 0, f'{width}: ordinary-motion placement draws its visible score effect')
        check(ordinary['frames'] > 0, f'{width}: ordinary-motion probe samples host geometry across animation frames')
        check(len(current(page)['log']) == len(ordinary_before['log']) + 1, f'{width}: ordinary-motion keyboard placement commits once')
        page.locator('.bc-host [data-command="undo"]').focus()
        page.keyboard.press('Enter')
        page.wait_for_function('(n)=>AlibiClub.diagnostics().state.runs.blockcabinet.log.length===n', arg=len(after['log']))
        page.wait_for_function('()=>!AlibiBlockMotion.diagnostics().pending')
        check(current(page)['log'] == after['log'], f'{width}: ordinary-motion probe restores the prior replay')
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
        lab(page, check_name=True)
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
        simple = page.locator('.bc-host [data-command="simple"]')
        simple.focus()
        page.keyboard.press('Enter')
        check(page.locator('.block-grid').is_visible(), f'{width}: simple controls remain playable')
        page.wait_for_function("() => document.activeElement?.classList.contains('block-cell')")
        check(page.locator('.block-grid .block-cell:focus').count() == 1, f'{width}: simple switch restores focus to the legacy board')
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
        page.evaluate('''() => {
          const originalFlush = AlibiClub.flush;
          window.__bcOriginalFlush = originalFlush;
          AlibiClub.flush = async (...args) => {
            window.__bcSaveStarted = true;
            await new Promise((resolve) => setTimeout(resolve, 400));
            return originalFlush(...args);
          };
        }''')
        page.locator('.bc-host [data-command="undo"]').click()
        page.wait_for_function('() => window.__bcSaveStarted === true')
        page.evaluate('location.hash="#/salon"')
        page.wait_for_function("() => !document.querySelector('.block-panel')")
        page.wait_for_timeout(600)
        check(not errors, f'{width}: route exit during a queued save does not throw')
        check(not page.evaluate('AlibiBlockMotion.diagnostics().active'), f'{width}: route exit disposes surface')
        check(not errors, f'{width}: no uncaught browser errors: {errors}')
        page.evaluate('AlibiClub.flush = window.__bcOriginalFlush')
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
