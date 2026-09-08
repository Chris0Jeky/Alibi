"""Real-origin scene completion, reload and installed-profile restart regression."""
import json, os, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get("ALIBI_URL","http://127.0.0.1:8787/").rstrip("/")+"/"
checks=[]
def check(ok,label):
    assert ok,label
    checks.append(label)
    print("PASS",label,flush=True)
with tempfile.TemporaryDirectory(prefix="alibi-restart-") as profile, sync_playwright() as pw:
    def launch():
        return pw.chromium.launch_persistent_context(profile,headless=True,viewport={"width":390,"height":844},reduced_motion="reduce")
    ctx=launch(); page=ctx.pages[0]; errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    page.goto(BASE); page.wait_for_function("() => !!globalThis.AlibiDiagnostics")
    puzzles=page.evaluate("ALIBI_CATALOG.puzzles.filter(p=>p.type==='scene')")
    for puzzle in puzzles + [puzzles[0]] * 3:
        key=puzzle['id']+'@'+str(puzzle['revision'])
        page.evaluate("s=>location.hash=s",'#/play/'+key)
        page.wait_for_function("k=>AlibiDiagnostics.getCurrent()?.key===k",arg=key)
        if page.evaluate("AlibiDiagnostics.getCurrent().completedAt"):
            page.locator('[data-action="restart"]').first.click()
            page.locator('[data-action="restart-confirm"]').click()
        if page.locator('dialog[open]').count():
            page.locator('[data-action="lesson-example"]').click()
            page.locator('[data-action="lesson-person"]').click()
            page.locator('[data-action="lesson-tap"][data-cell="5"]').click()
            page.locator('[data-action="lesson-finish"]').click()
        for person in puzzle['people']:
            page.locator('[data-action="person"][data-id="'+person['id']+'"]').click()
            page.locator('[data-action="cell"][data-cell="'+str(puzzle['solution'][person['id']])+'"]').click()
        room=puzzle['rooms'][puzzle['solution'][puzzle['victim']]]
        culprit=next(p['id'] for p in puzzle['people'] if p['id']!=puzzle['victim'] and puzzle['rooms'][puzzle['solution'][p['id']]]==room)
        page.locator('[data-action="choose-accuse"][data-id="'+culprit+'"]').click()
        page.locator('[data-action="submit-accuse"]').click()
        page.wait_for_function("() => AlibiDiagnostics.getCurrent()?.completedAt && AlibiDiagnostics.getStatus().pendingSaves===0")
        before=page.evaluate("AlibiDiagnostics.getCurrent()")
        page.reload();page.wait_for_function("() => !!globalThis.AlibiDiagnostics")
        after=page.evaluate("AlibiDiagnostics.getCurrent()")
        check(after['state']==before['state'] and after['completedAt']==before['completedAt'],key+' restores completed board after reload')
    page.evaluate("location.hash='#/salon/borough'")
    page.locator('.borough-cell:not(.built)').first.click()
    page.locator('[data-action="club-build"]').click()
    page.evaluate("() => AlibiClub.save()")
    club_before=page.evaluate("AlibiClub.diagnostics().state")
    page.evaluate("location.hash='#/settings'")
    with page.expect_download() as download:
        page.locator('[data-action="club-export"]').click()
    exported=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
    check(exported['runs']['borough']['log']==club_before['runs']['borough']['log'],'Club export contains the actual built town')
    exported['settings']['pinned']=2
    page.locator('#club-import').set_input_files({'name':'restore.json','mimeType':'application/json','buffer':json.dumps(exported).encode()})
    page.locator('[data-action="club-restore-confirm"]').click()
    page.wait_for_function("() => AlibiClub.diagnostics().state.settings.pinned===2")
    with page.expect_download() as download:
        page.locator('[data-action="club-recovery"]').click()
    recovery=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
    check(recovery==club_before,'Club restore atomically retains the previous save as a recovery download')
    ctx.close();ctx=launch();page=ctx.pages[0];page.goto(BASE);page.wait_for_function("() => !!globalThis.AlibiDiagnostics")
    check(page.evaluate("AlibiClub.diagnostics().state.settings.pinned") == 2,'Restored Club preferences survive process restart')
    check(page.evaluate("AlibiDiagnostics.getCounts().records")==len(puzzles),'All completed scenes survive browser process restart')
    ctx.set_offline(True);page.reload();page.wait_for_function("() => !!globalThis.AlibiDiagnostics")
    check(page.evaluate("AlibiDiagnostics.getCounts().records")==len(puzzles),'Offline restart retains all scene completions')
    check(not errors,'No unhandled scene completion errors')
    ctx.close()
output=ROOT/'test-results'/'browser-restart';output.mkdir(parents=True,exist_ok=True)
(output/'results.json').write_text(json.dumps({'url':BASE,'passed':True,'checks':checks,'physicalAndroid':False},indent=2))
