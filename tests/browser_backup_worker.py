"""Combined imports run off the UI thread and terminate on a deadline without writing saves."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')
checks=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    page=browser.new_page()
    page.goto(BASE+'#/settings')
    page.wait_for_function('() => !!window.AlibiDiagnostics')
    page.get_by_text('Curated challenge replays are separate:',exact=False).wait_for()
    page.context.set_offline(True)
    with page.expect_download() as download:
        page.locator('[data-action="export-all"]').click()
    message=page.locator('#toasts').inner_text()
    assert 'Cabinet, Club exported.' in message and 'Quiet Wing was not included:' in message
    assert 'Quiet Wing exported.' not in message
    page.context.set_offline(False)
    data=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
    assert data['manifest']==['cabinet','club'] and any('Quiet Wing was not included:' in w for w in data['warnings'])
    # Reload into the core shell; validation must not execute the activity bundle here.
    page.reload();page.wait_for_function('() => !!window.AlibiDiagnostics')
    page.evaluate('''() => {const Original=Worker;window.jobs=[];window.Worker=class extends Original {
      postMessage(m){jobs.push(m.type);super.postMessage(m)}
      terminate(){window.stopped=(window.stopped||0)+1;super.terminate()}
    }}''')
    def submit(value):
        page.locator('[data-action="import-all"]').click()
        page.locator('#all-backup-input').set_input_files({'name':'combined.json','mimeType':'application/json','buffer':json.dumps(value).encode()})
    before=page.evaluate('AlibiDiagnostics.getCounts()')
    submit(data)
    page.locator('[data-action="all-cabinet"]').wait_for()
    assert page.evaluate("jobs.includes('combined-backup') && stopped===1 && !window.QWEngine")
    assert page.evaluate('AlibiDiagnostics.getCounts()')==before
    checks.append('Valid combined backup stages in a terminated worker with no save writes or optional UI code')
    page.get_by_role('button',name='Cancel',exact=True).click()
    partial=json.loads(json.dumps(data));partial['manifest']=['cabinet','club'];partial['sections'].pop('quiet',None);partial['warnings']=['Quiet Wing was not included: unavailable offline. Export it separately when available.']
    submit(partial)
    page.get_by_text('Warnings:',exact=False).wait_for()
    assert page.get_by_text('Quiet Wing was not included:',exact=False).is_visible()
    checks.append('Offline cabinet and Club export stages with an explicit missing Quiet Wing warning')
    page.locator('[data-action="all-cabinet"]').click()
    page.locator('[data-action="restore-merge"]').wait_for()
    assert page.evaluate("jobs.includes('cabinet-backup')")
    page.get_by_role('button',name='Cancel',exact=True).click()
    submit(data)
    page.locator('[data-action="all-club"]').click()
    page.locator('[data-action="club-restore-confirm"]').wait_for()
    assert page.evaluate("jobs.includes('club-backup')")
    checks.append('Selecting cabinet and Club sections also validates through workers before restore review')
    page.get_by_role('button',name='Cancel',exact=True).click()
    bad=json.loads(json.dumps(data));bad['sections']['cabinet']['runs']=[{'schemaVersion':99}]
    submit(bad)
    page.get_by_text('Unsupported saved-game format.',exact=True).wait_for()
    assert not page.locator('[data-action="all-cabinet"]').is_visible()
    assert page.evaluate('AlibiDiagnostics.getCounts()')==before
    checks.append('Malformed section is refused before staging and preserves all device counts')
    # Simulate a non-returning validator and observe real UI responsiveness and termination.
    page.evaluate('''() => {const Original=Worker;window.Worker=class extends Original {
      constructor(){super(URL.createObjectURL(new Blob(['while(true){}'],{type:'text/javascript'})))}
    };window.ticks=0;setInterval(()=>ticks++,50)}''')
    submit(data)
    page.get_by_text('Validation reached its 25-second safety limit. Use a smaller pack or simpler puzzle.',exact=True).wait_for(timeout=35000)
    assert page.evaluate('ticks>100 && stopped>=6')
    assert page.evaluate('AlibiDiagnostics.getCounts()')==before
    checks.append('Stalled worker is terminated at 25 seconds while the UI remains responsive and saves unchanged')
    browser.close()
out=ROOT/'test-results/quiet-wing/backup-worker-results.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'url':BASE,'checks':checks,'passed':True},indent=2))
print(json.dumps(checks,indent=2))
