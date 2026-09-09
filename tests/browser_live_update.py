"""Observe a real deployment using disposable profiles; run explicitly, never in CI.

Seed both current published origins, then wait for test-results/live-update/deployed.json
containing {"build": "EXPECTED_BUILD"}. The coordinator writes this only after publishing
and checking the complete release. Failure diagnostics are retained. Browser contexts remain open while the release is published.
"""
import json, os, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_update import wait_for_app, dismiss_lesson, make_sudoku_move, current
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('ALIBI_LIVE_RESULTS',str(ROOT/'test-results/live-update')));OUT.mkdir(parents=True,exist_ok=True)
MARKER=OUT/'deployed.json'
if MARKER.exists():
    raise RuntimeError('Use a fresh evidence directory; deployment marker already exists')
TRACE_SCRIPT=r"""(() => {
  window.updateTrace=[];
  const note=(kind,data)=>updateTrace.push({at:Date.now(),kind,...data});
  const watch=w=>{if(w){note('worker',{state:w.state,url:w.scriptURL});w.addEventListener('statechange',()=>note('statechange',{state:w.state,url:w.scriptURL}));}};
  navigator.serviceWorker.addEventListener('controllerchange',()=>note('controllerchange',{url:navigator.serviceWorker.controller?.scriptURL}));
  navigator.serviceWorker.getRegistration().then(r=>{if(!r)return;[r.active,r.waiting,r.installing].forEach(watch);r.addEventListener('updatefound',()=>{note('updatefound',{});watch(r.installing);});});
})();"""
def snapshot(page):
    return page.evaluate("""async()=>({config:window.ALIBI_CONFIG,status:window.AlibiDiagnostics?.getStatus(),trace:window.updateTrace,registrations:await Promise.all((await navigator.serviceWorker.getRegistrations()).map(async r=>({scope:r.scope,active:r.active&&{url:r.active.scriptURL,state:r.active.state},waiting:r.waiting&&{url:r.waiting.scriptURL,state:r.waiting.state},installing:r.installing&&{url:r.installing.scriptURL,state:r.installing.state}}))),caches:await caches.keys()})""")
results=[]
with sync_playwright() as pw:
    sessions=[];contexts=[]
    browser=pw.chromium.launch(headless=True)
    try:
        for label,host in [('primary','https://alibi-after-hours-preview.commit-atlas.workers.dev/'),('fallback','https://alibi-puzzle-club.jeky-tck.chatgpt.site/')]:
            profile=OUT/(label+'-profile')
            if profile.exists():raise RuntimeError('Refuse to reuse a prior test profile')
            c=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
            events=[]
            c.on('response',lambda r,log=events:log.append({'url':r.url,'status':r.status}) if r.status>=400 or r.url.endswith('sw.js') else None)
            c.on('requestfailed',lambda r,log=events:log.append({'url':r.url,'failed':r.failure}))
            page=c.new_page();page.add_init_script(TRACE_SCRIPT)
            contexts.append((label,c,page,events))
            cdp=c.new_cdp_session(page)
            cdp.send('ServiceWorker.enable')
            cdp.on('ServiceWorker.workerErrorReported',lambda e,log=events:log.append({'workerError':e}))
            cdp.on('ServiceWorker.workerVersionUpdated',lambda e,log=events:log.append({'workerVersions':e}))
            page.goto(host+'#/play/sudoku-01@1');wait_for_app(page);dismiss_lesson(page)
            page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
            page.evaluate(TRACE_SCRIPT)
            old=page.evaluate('ALIBI_CONFIG');run=make_sudoku_move(page,1)
            sessions.append((label,host,c,page,old,run,events))
            (OUT/(label+'-before.json')).write_text(json.dumps({'runtime':old,'run':run,'snapshot':snapshot(page)},indent=2))
            print('SEEDED',label,old,flush=True)
        deadline=time.monotonic()+7200
        while not MARKER.exists():
            if time.monotonic()>deadline:raise TimeoutError('No deployment marker within two hours')
            sessions[0][3].wait_for_timeout(1000)
        expected=json.loads(MARKER.read_text())['build']
        for label,host,c,page,old,run,events in sessions:
            result={'origin':host,'before':old,'expectedBuild':expected,'passed':False}
            try:
                page.locator('.top-actions [data-page="settings"]').click()
                page.locator('[data-action="check-update"]').click()
                page.wait_for_function('()=>AlibiDiagnostics.getStatus().waitingUpdate',timeout=90000)
                assert page.evaluate('ALIBI_CONFIG.build')==old['build'],'Old release stays active while update waits'
                page.locator('[aria-label="Alibi home"]:visible').click()
                page.locator('.club-letter [data-action="open"]').click();wait_for_app(page)
                second=make_sudoku_move(page,2)
                page.locator('[data-action="apply-update"]').click(no_wait_after=True)
                page.wait_for_function('(build)=>window.ALIBI_CONFIG?.build===build && AlibiDiagnostics.getCurrent()?.moves===2',arg=expected,timeout=60000)
                after=current(page)
                assert after['state']==second['state'] and after['puzzle']==run['puzzle']
                c.set_offline(True);page.reload();wait_for_app(page)
                assert current(page)['state']==second['state'] and current(page)['puzzle']==run['puzzle']
                assert page.evaluate('ALIBI_CONFIG.build')==expected
                result.update(passed=True,after=page.evaluate('ALIBI_CONFIG'),checks=['Actual Check for updates finds release','Old app retains an extra saved move before activation','Actual Save & update preserves exact state and pinned definition','Offline reload preserves release and state'])
            except Exception:
                result['error']=traceback.format_exc()
            finally:
                try:result['snapshot']=snapshot(page);page.screenshot(path=str(OUT/(label+'-final.png')),full_page=True)
                except Exception:result['snapshotError']=traceback.format_exc()
                result['network']=events
                (OUT/(label+'-result.json')).write_text(json.dumps(result,indent=2))
                results.append(result);print('PASS' if result['passed'] else 'FAIL',label,flush=True)
    except Exception:
        (OUT/'seed-or-wait-error.txt').write_text(traceback.format_exc())
        raise
    finally:
        for label,c,page,events in contexts:
            try:
                (OUT/(label+'-last-snapshot.json')).write_text(json.dumps({'snapshot':snapshot(page),'network':events},indent=2))
            except Exception:pass
            c.close()
        browser.close()
        (OUT/'results.json').write_text(json.dumps({'passed':len(results)==2 and all(r['passed'] for r in results),'results':results},indent=2))
if len(results)!=2 or not all(r['passed'] for r in results):raise SystemExit(1)
